#!/usr/bin/env python3
# ========================================
# Script para verificar tabelas no Neon
# ========================================

from sqlalchemy import create_engine, text

# Neon connection
engine = create_engine(
    'postgresql://neondb_owner:npg_pY5C0lHhARfx@ep-muddy-bread-acs8josc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
)

try:
    with engine.connect() as conn:
        # Check tables
        result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"))
        tables = [row[0] for row in result]
        
        print("📊 Tabelas existentes no Neon:")
        for table in tables:
            print(f"  - {table}")
        
        if tables:
            print(f"\n💡 Total: {len(tables)} tabelas")
            print("\n🔧 Para reset do banco (CUIDADO):")
            print("   1. Deletar todas as tabelas")
            print("   2. Executar migration fresh")
        else:
            print("\n✅ Banco limpo, pronto para migrations!")
            
except Exception as e:
    print(f"❌ Erro ao conectar no Neon: {e}")