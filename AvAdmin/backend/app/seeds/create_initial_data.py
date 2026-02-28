#!/usr/bin/env python3
# ========================================
# AVADMIN - Seeds (Initial Data)
# ========================================

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from decimal import Decimal
from passlib.context import CryptContext

# Add app to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionFactory
from app.models import (
    Plan, Account, User, BillingTransaction, AuditLog,
    BillingCycle, PlanType, AccountStatus, UserRole, 
    TransactionStatus, PaymentMethod, AuditAction
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_plans():
    """Create initial SaaS plans"""
    
    plans_data = [
        {
            "name": "Lojista",
            "slug": "lojista",
            "description": "Ideal para lojistas individuais e pequenos negócios",
            "price": Decimal("39.90"),
            "billing_cycle": BillingCycle.MONTHLY,
            "plan_type": PlanType.INDIVIDUAL,
            "max_users": "1",
            "max_products": "150",
            "max_transactions": "500",
            "max_storage_gb": "1",
            "trial_days": "7",
            "display_order": "1",
            "color": "#10B981",
            "is_popular": False,
            "features": {
                "modules": ["StockTech"],
                "whatsapp_integration": True,
                "api_access": False,
                "custom_branding": False,
                "priority_support": False,
                "advanced_analytics": False,
                "export_data": True,
                "multi_location": False
            }
        },
        {
            "name": "Empresa",
            "slug": "empresa", 
            "description": "Para empresas que precisam de mais recursos e usuários",
            "price": Decimal("89.90"),
            "billing_cycle": BillingCycle.MONTHLY,
            "plan_type": PlanType.BUSINESS,
            "max_users": "5",
            "max_products": "500",
            "max_transactions": "2000",
            "max_storage_gb": "5",
            "trial_days": "14",
            "display_order": "2",
            "color": "#3B82F6",
            "is_popular": True,
            "features": {
                "modules": ["StockTech", "Lucrum"],
                "whatsapp_integration": True,
                "api_access": True,
                "custom_branding": True,
                "priority_support": False,
                "advanced_analytics": True,
                "export_data": True,
                "multi_location": True
            }
        },
        {
            "name": "Corporativo",
            "slug": "corporativo",
            "description": "Solução completa para grandes empresas",
            "price": Decimal("199.90"),
            "billing_cycle": BillingCycle.MONTHLY,
            "plan_type": PlanType.ENTERPRISE,
            "max_users": "20",
            "max_products": "-1",  # Unlimited
            "max_transactions": "-1",  # Unlimited
            "max_storage_gb": "50",
            "trial_days": "30",
            "display_order": "3", 
            "color": "#8B5CF6",
            "is_popular": False,
            "features": {
                "modules": ["StockTech", "Lucrum"],
                "whatsapp_integration": True,
                "api_access": True,
                "custom_branding": True,
                "priority_support": True,
                "advanced_analytics": True,
                "export_data": True,
                "multi_location": True,
                "white_label": True,
                "custom_integrations": True
            }
        }
    ]
    
    async with AsyncSessionFactory() as db:
        try:
            created_plans = []
            
            for plan_data in plans_data:
                # Check if plan already exists
                result = await db.execute(
                    select(Plan.id).where(Plan.slug == plan_data["slug"])
                )
                if result.scalar():
                    print(f"⚠️  Plano {plan_data['name']} já existe, pulando...")
                    continue
                
                plan = Plan(**plan_data)
                db.add(plan)
                created_plans.append(plan)
                print(f"✅ Plano criado: {plan.name} - R$ {plan.price}/{plan.billing_cycle.value}")
            
            await db.commit()
            
            # Return plans for use in accounts
            if created_plans:
                await db.refresh(created_plans[1])  # Empresa plan
                return created_plans[1].id  # Return Empresa plan ID for demo account
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Erro ao criar planos: {e}")
            raise

async def create_super_admin():
    """Create super admin user"""
    
    async with AsyncSessionFactory() as db:
        try:
            # Check if super admin exists
            result = await db.execute(
                select(User.id).where(User.cpf == "00000000000")
            )
            if result.scalar():
                print("⚠️  Super Admin já existe, pulando...")
                return
            
            # Create super admin (without account) - CPF válido
            super_admin = User(
                full_name="Administrador AvelarSys",
                cpf="11144477735",  # CPF válido para super admin
                whatsapp="+5511999999999",
                password_hash=pwd_context.hash("admin123"),
                role=UserRole.SUPER_ADMIN,
                account_id=None,  # Super admin doesn't belong to any account
                is_active=True,
                whatsapp_verified=True  # Pre-verified
            )
            
            db.add(super_admin)
            await db.commit()
            
            print(f"✅ Super Admin criado:")
            print(f"   CPF: {super_admin.masked_cpf}")
            print(f"   WhatsApp: {super_admin.formatted_whatsapp}")
            print(f"   Senha: admin123")
            
            # Create audit log
            audit = AuditLog.create_log(
                action=AuditAction.CREATE,
                resource_type="user",
                resource_id=str(super_admin.id),
                description="Super Admin criado via seeds",
                extra_data={"created_via": "seeds", "role": "super_admin"}
            )
            db.add(audit)
            await db.commit()
            
            return super_admin.id
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Erro ao criar Super Admin: {e}")
            raise

async def create_demo_account(empresa_plan_id):
    """Create demo company account"""
    
    async with AsyncSessionFactory() as db:
        try:
            # Check if demo account exists
            result = await db.execute(
                select(Account.id).where(Account.document == "11222333000181")
            )
            existing_id = result.scalar()
            if existing_id:
                print("⚠️  Conta demo já existe, pulando...")
                return existing_id
            
            # Create demo company account - CNPJ válido
            demo_account = Account(
                company_name="Empresa Demo LTDA",
                cnpj="11222333000181",  # CNPJ válido para empresa demo
                whatsapp="+5511888888888",
                responsible_name="João Silva Santos",
                address="Rua das Flores, 123",
                city="São Paulo",
                state="SP",
                zip_code="01234567",
                plan_id=empresa_plan_id,
                status=AccountStatus.ACTIVE,
                enabled_modules=["StockTech"],  # StockTech habilitado
                whatsapp_verified=True,
                max_users="5",
                max_products="500", 
                max_transactions="2000",
                current_users="1",  # Will have 1 user (demo user)
                current_products="0",
                current_transactions_month="0",
                settings={"theme": "light", "notifications": True}
            )
            
            db.add(demo_account)
            await db.commit()
            await db.refresh(demo_account)
            
            print(f"✅ Conta demo criada:")
            print(f"   Empresa: {demo_account.company_name}")
            print(f"   CNPJ: {demo_account.formatted_cnpj}")
            print(f"   WhatsApp: {demo_account.formatted_whatsapp}")
            print(f"   Módulos: {demo_account.enabled_modules}")
            
            return demo_account.id
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Erro ao criar conta demo: {e}")
            raise

async def create_demo_user(account_id):
    """Create demo user for demo company"""
    
    async with AsyncSessionFactory() as db:
        try:
            # Check if demo user exists
            result = await db.execute(
                select(User.id).where(User.cpf == "11144477735")
            )
            if result.scalar():
                print("⚠️  Usuário demo já existe, pulando...")
                return
            
            # Create demo user - CPF válido
            demo_user = User(
                full_name="João Silva Santos",
                cpf="11144477735",  # CPF válido para usuário demo
                whatsapp="+5511777777777",
                password_hash=pwd_context.hash("user123"),
                role=UserRole.USER,
                account_id=account_id,
                is_active=True,
                whatsapp_verified=True,  # Pre-verified
                login_count="0"
            )
            
            db.add(demo_user)
            await db.commit()
            
            print(f"✅ Usuário demo criado:")
            print(f"   Nome: {demo_user.full_name}")
            print(f"   CPF: {demo_user.masked_cpf}")
            print(f"   WhatsApp: {demo_user.formatted_whatsapp}")
            print(f"   Senha: user123")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Erro ao criar usuário demo: {e}")
            raise

async def main():
    """Main seed function"""
    print("🌱 Criando dados iniciais do AvAdmin...")
    print("=====================================")
    
    try:
        # 1. Create plans
        print("\n📋 1. Criando planos SaaS...")
        empresa_plan_id = await create_plans()
        
        # 2. Create super admin
        print("\n👑 2. Criando Super Admin...")
        await create_super_admin()
        
        # 3. Create demo account
        print("\n🏢 3. Criando conta demo...")
        demo_account_id = await create_demo_account(empresa_plan_id)
        
        # 4. Create demo user
        print("\n👤 4. Criando usuário demo...")
        await create_demo_user(demo_account_id)
        
        print("\n🎉 Seeds concluídos com sucesso!")
        print("===============================")
        print()
        print("🔐 Credenciais criadas:")
        print("   👑 Super Admin:")
        print("     CPF: 000.000.000-00")  
        print("     Senha: admin123")
        print()
        print("   🏢 Empresa Demo:")
        print("     CNPJ: 12.345.678/0001-00")
        print("     WhatsApp: +55 (11) 88888-8888")
        print()
        print("   👤 Usuário Demo:")
        print("     CPF: 123.456.789-00")
        print("     Senha: user123")
        print("     WhatsApp: +55 (11) 77777-7777")
        print()
        print("💡 Próximo passo: Implementar APIs de autenticação")
        
    except Exception as e:
        print(f"\n❌ Erro durante seeds: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)