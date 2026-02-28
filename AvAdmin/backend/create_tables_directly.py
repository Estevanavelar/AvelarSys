#!/usr/bin/env python3
# ========================================
# Criar tabelas diretamente via SQLAlchemy
# ========================================

import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.append(str(Path(__file__).parent))

async def create_tables():
    """Create tables directly using SQLAlchemy"""
    
    print("🏗️ Criando tabelas diretamente no Neon...")
    
    from app.core.database import engine
    from app.models import Base
    
    try:
        async with engine.begin() as conn:
            # Drop all tables first (clean slate)
            await conn.run_sync(Base.metadata.drop_all)
            print("🗑️ Tabelas antigas removidas")
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            print("✅ Tabelas criadas com sucesso")
            
            # Verify tables
            from sqlalchemy import text
            result = await conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                ORDER BY tablename
            """))
            
            tables = [row[0] for row in result]
            print(f"📊 {len(tables)} tabelas criadas:")
            for table in tables:
                print(f"   • {table}")
            
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(create_tables())
    if success:
        print("\n💡 Próximo passo: python3 app/seeds/create_initial_data.py")
    sys.exit(0 if success else 1)