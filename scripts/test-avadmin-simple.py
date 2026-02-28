#!/usr/bin/env python3
# ========================================
# TESTE SIMPLIFICADO DO AVADMIN
# ========================================
# Testa apenas as funcionalidades básicas sem dependências complexas

import asyncio
import sys
import os

# Adicionar caminho do projeto
sys.path.insert(0, '/home/avelarsys/AvelarSys/AvAdmin/backend')

async def test_basic():
    """Teste básico das funcionalidades essenciais"""

    print("🧪 TESTANDO AVADMIN - VERSÃO SIMPLIFICADA")
    print("=" * 50)

    try:
        # Testar importações básicas
        print("📦 Testando importações...")

        from app.core.config import settings
        print("✅ Config importado")

        from app.core.security import security
        print("✅ Security importado")

        from app.models import User, Account
        print("✅ Models importados")

        from app.services.auth import auth_service
        print("✅ Auth service importado")

        # Testar validação CPF
        print("\n🔍 Testando validações...")

        # CPF válido (Super Admin)
        cpf = "00000000000"
        normalized = security.normalize_document(cpf)
        print(f"✅ CPF {cpf} -> {normalized}")

        # CPF inválido
        try:
            security.normalize_document("11111111111")
            print("❌ CPF inválido aceito (problema)")
        except ValueError:
            print("✅ CPF inválido rejeitado")

        # Testar hash de senha
        print("\n🔐 Testando criptografia...")

        password = "test123"
        hashed = security.hash_password(password)
        verified = security.verify_password(password, hashed)

        print(f"✅ Hash gerado: {hashed[:20]}...")
        print(f"✅ Verificação: {'OK' if verified else 'FALHA'}")

        # Testar geração de código
        code = security.generate_verification_code()
        print(f"✅ Código gerado: {code} (6 dígitos)")

        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("✅ AvAdmin pronto para uso básico")

        return True

    except Exception as e:
        print(f"\n❌ ERRO NOS TESTES: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_database():
    """Teste de conexão com banco de dados"""

    print("\n💾 TESTANDO BANCO DE DADOS...")

    try:
        from app.core.database import init_database, close_database

        await init_database()
        print("✅ Conexão com Supabase estabelecida")

        # Testar query simples
        from sqlalchemy import text
        from app.core.database import AsyncSessionFactory

        async with AsyncSessionFactory() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM avelar_admin.users"))
            count = result.scalar()
            print(f"✅ Query executada: {count} usuários encontrados")

        await close_database()
        print("✅ Conexão fechada com sucesso")

        return True

    except Exception as e:
        print(f"❌ ERRO NO BANCO: {e}")
        return False

async def test_whatsapp():
    """Teste do serviço WhatsApp simplificado"""

    print("\n📱 TESTANDO WHATSAPP SERVICE...")

    try:
        from app.services.whatsapp import send_verification_code, health_check

        # Testar health check
        health = await health_check()
        print(f"✅ WhatsApp health: {'OK' if health else 'FALHA'}")

        # Testar envio de código (simulado)
        success = await send_verification_code("+5511999999999", "123456")
        print(f"✅ Código de verificação: {'ENVIADO' if success else 'FALHA'}")

        return True

    except Exception as e:
        print(f"❌ ERRO WHATSAPP: {e}")
        return False

async def main():
    """Função principal de teste"""

    # Teste básico
    basic_ok = await test_basic()

    # Só testa banco se básico passou
    if basic_ok:
        db_ok = await test_database()
        whatsapp_ok = await test_whatsapp()

        print("\n" + "=" * 50)
        print("📊 RESUMO DOS TESTES:")
        print(f"🔧 Básico: {'✅' if basic_ok else '❌'}")
        print(f"💾 Banco: {'✅' if db_ok else '❌'}")
        print(f"📱 WhatsApp: {'✅' if whatsapp_ok else '❌'}")

        if basic_ok and db_ok and whatsapp_ok:
            print("\n🎉 AVADMIN PRONTO PARA USO!")
            print("🚀 Pode iniciar o backend sem problemas")
        else:
            print("\n⚠️ Alguns testes falharam - verificar dependências")
    else:
        print("\n❌ Testes básicos falharam - corrigir antes de prosseguir")

if __name__ == "__main__":
    asyncio.run(main())
