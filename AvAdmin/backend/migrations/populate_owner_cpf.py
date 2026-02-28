#!/usr/bin/env python3
"""
Script para popular o campo owner_cpf nas contas existentes
Busca o primeiro usuário admin de cada conta e usa seu CPF como owner_cpf
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from dotenv import load_dotenv

# Carregar .env
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# URL do banco Neon
DATABASE_URL = os.getenv(
    'AVADMIN_DATABASE_URL',
    'postgresql://neondb_owner:npg_pY5C0lHhARfx@ep-muddy-bread-acs8josc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
)

DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
DATABASE_URL = DATABASE_URL.replace('ssl=require', 'sslmode=require')

def populate_owner_cpf():
    """Popula owner_cpf para contas existentes"""
    
    print("🔗 Conectando ao banco Neon...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Buscar contas sem owner_cpf
        cursor.execute("""
            SELECT id, company_name, cnpj 
            FROM accounts 
            WHERE owner_cpf IS NULL
        """)
        
        accounts = cursor.fetchall()
        print(f"📊 Encontradas {len(accounts)} contas sem owner_cpf")
        
        updated = 0
        for account_id, company_name, cnpj in accounts:
            # Buscar primeiro usuário admin ou super_admin da conta
            cursor.execute("""
                SELECT cpf, full_name, role
                FROM users
                WHERE account_id = %s 
                AND role IN ('admin', 'super_admin')
                ORDER BY created_at ASC
                LIMIT 1
            """, (account_id,))
            
            user = cursor.fetchone()
            
            if user:
                owner_cpf, full_name, role = user
                cursor.execute("""
                    UPDATE accounts 
                    SET owner_cpf = %s 
                    WHERE id = %s
                """, (owner_cpf, account_id))
                
                print(f"  ✅ {company_name}: owner_cpf = {owner_cpf} ({full_name})")
                updated += 1
            else:
                print(f"  ⚠️  {company_name}: Nenhum usuário admin encontrado")
        
        conn.commit()
        
        print(f"\n🎉 Atualizadas {updated} de {len(accounts)} contas")
        
        # Mostrar resultado final
        cursor.execute("""
            SELECT company_name, cnpj, owner_cpf 
            FROM accounts 
            ORDER BY company_name
        """)
        
        print("\n📊 Estado atual das contas:")
        for row in cursor.fetchall():
            cpf_status = row[2] if row[2] else "❌ vazio"
            print(f"   - {row[0]} (CNPJ: {row[1]}): owner_cpf = {cpf_status}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == '__main__':
    success = populate_owner_cpf()
    sys.exit(0 if success else 1)
