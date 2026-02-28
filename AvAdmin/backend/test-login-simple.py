#!/usr/bin/env python3
# ========================================
# Teste simples de login sem cache
# ========================================

import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.append(str(Path(__file__).parent))

async def test_login_direct():
    """Testar login diretamente no banco sem cache"""
    
    print("🔐 Teste de Login Direto (sem cache)")
    print("===================================")
    
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select, text
    from app.models import User
    from app.core.security import security
    
    # Create engine sem cache
    engine = create_async_engine(
        "postgresql+asyncpg://neondb_owner:npg_pY5C0lHhARfx@ep-muddy-bread-acs8josc-pooler.sa-east-1.aws.neon.tech/neondb?ssl=require",
        echo=False,
        pool_size=1,
        max_overflow=0,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        }
    )
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            print("1. 🔗 Conectando no banco...")
            
            # Test connection
            result = await db.execute(text("SELECT 1"))
            print("   ✅ Conexão OK")
            
            print("2. 📊 Verificando usuários...")
            
            # List all users
            result = await db.execute(text("SELECT cpf, full_name, role FROM users"))
            users = result.fetchall()
            
            print(f"   📋 {len(users)} usuários encontrados:")
            for user in users:
                print(f"     • {user[1]} (CPF: {user[0]}, Role: {user[2]})")
            
            print("3. 🔐 Testando autenticação...")
            
            # Test CPF validation
            test_cpf = "11144477735"
            print(f"   🔍 Testando CPF: {test_cpf}")
            
            if security.validate_cpf(test_cpf):
                print("   ✅ CPF válido")
            else:
                print("   ❌ CPF inválido")
            
            # Find user directly
            result = await db.execute(
                text("SELECT id, full_name, password_hash, role FROM users WHERE cpf = :cpf"),
                {"cpf": test_cpf}
            )
            user_data = result.fetchone()
            
            if user_data:
                print(f"   ✅ Usuário encontrado: {user_data[1]}")
                
                # Test password
                if security.verify_password("admin123", user_data[2]):
                    print("   ✅ Senha correta")
                    
                    # Create token
                    token_data = {
                        "user_id": str(user_data[0]),
                        "cpf": test_cpf,
                        "role": user_data[3]
                    }
                    
                    token = security.create_access_token(token_data)
                    print(f"   ✅ Token gerado: {token[:50]}...")
                    
                    # Verify token
                    payload = security.verify_token(token)
                    if payload:
                        print("   ✅ Token válido")
                        print(f"   📊 Payload: {payload}")
                    else:
                        print("   ❌ Token inválido")
                        
                else:
                    print("   ❌ Senha incorreta")
            else:
                print("   ❌ Usuário não encontrado")
                
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False
    
    finally:
        await engine.dispose()
    
    return True

if __name__ == "__main__":
    asyncio.run(test_login_direct())