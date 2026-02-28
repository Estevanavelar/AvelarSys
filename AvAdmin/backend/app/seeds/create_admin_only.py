#!/usr/bin/env python3
# ========================================
# AVADMIN - Seeds (Admin Only - Real Data)
# ========================================

import asyncio
import sys
from pathlib import Path
from passlib.context import CryptContext

# Add app to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionFactory
from app.models import User, UserRole

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_super_admin():
    """Create super admin user"""
    
    async with AsyncSessionFactory() as db:
        try:
            # Check if super admin exists
            result = await db.execute(
                select(User.id).where(User.cpf == "11144477735")
            )
            if result.scalar():
                print("⚠️  Super Admin já existe")
                return
            
            # Create super admin
            super_admin = User(
                full_name="Administrador AvelarSys",
                cpf="11144477735",
                whatsapp="+5511999999999",
                password_hash=pwd_context.hash("admin123"),
                role=UserRole.SUPER_ADMIN,
                account_id=None,
                is_active=True,
                whatsapp_verified=True
            )
            
            db.add(super_admin)
            await db.commit()
            
            print(f"✅ Super Admin criado:")
            print(f"   CPF: {super_admin.masked_cpf}")
            print(f"   WhatsApp: {super_admin.formatted_whatsapp}")
            print(f"   Senha: admin123")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Erro ao criar Super Admin: {e}")
            raise

async def main():
    """Main seed function"""
    print("🌱 Criando Super Admin (apenas dados reais)...")
    print("="*50)
    
    try:
        await create_super_admin()
        
        print("\n🎉 Setup concluído!")
        print("="*50)
        print()
        print("🔐 Credenciais:")
        print("   👑 Super Admin:")
        print("     CPF: 111.444.777-35")  
        print("     Senha: admin123")
        print()
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
