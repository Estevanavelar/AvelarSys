import aiosqlite
import json
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from app.config import settings
from app.models import Campaign, Message, CampaignStatus, MessageStatus


class Database:
    """Gerenciador de banco de dados SQLite"""
    
    def __init__(self):
        self.db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        # Criar diretório do banco se não existir
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    
    @asynccontextmanager
    async def get_connection(self):
        """Context manager para conexão com o banco"""
        conn = await aiosqlite.connect(self.db_path)
        conn.row_factory = aiosqlite.Row
        try:
            yield conn
        finally:
            await conn.close()
    
    async def initialize(self):
        """Cria tabelas se não existirem"""
        async with self.get_connection() as conn:
            # Tabela de campanhas
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    message_template TEXT NOT NULL,
                    status TEXT DEFAULT 'created',
                    total_contacts INTEGER DEFAULT 0,
                    sent_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    pending_count INTEGER DEFAULT 0,
                    delay_min INTEGER DEFAULT 5,
                    delay_max INTEGER DEFAULT 15,
                    max_per_hour INTEGER DEFAULT 50,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP
                )
            """)
            
            # Tabela de mensagens
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    campaign_id INTEGER NOT NULL,
                    phone TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    attempt_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    sent_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
                )
            """)
            
            # Índices
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_campaign 
                ON messages(campaign_id)
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_status 
                ON messages(status)
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_phone 
                ON messages(phone)
            """)
            
            await conn.commit()
    
    async def create_campaign(self, name: str, message_template: str, 
                             delay_min: int, delay_max: int, 
                             max_per_hour: int) -> int:
        """Cria uma nova campanha e retorna o ID"""
        async with self.get_connection() as conn:
            cursor = await conn.execute("""
                INSERT INTO campaigns (name, message_template, delay_min, delay_max, max_per_hour)
                VALUES (?, ?, ?, ?, ?)
            """, (name, message_template, delay_min, delay_max, max_per_hour))
            await conn.commit()
            return cursor.lastrowid
    
    async def add_contacts(self, campaign_id: int, contacts: List[Dict[str, Any]]):
        """Adiciona contatos à campanha"""
        async with self.get_connection() as conn:
            for contact in contacts:
                await conn.execute("""
                    INSERT INTO messages (campaign_id, phone, message, status)
                    VALUES (?, ?, ?, 'pending')
                """, (campaign_id, contact['phone'], contact['message']))
            
            # Atualizar contagem
            await conn.execute("""
                UPDATE campaigns 
                SET total_contacts = (SELECT COUNT(*) FROM messages WHERE campaign_id = ?),
                    pending_count = (SELECT COUNT(*) FROM messages WHERE campaign_id = ? AND status = 'pending')
                WHERE id = ?
            """, (campaign_id, campaign_id, campaign_id))
            
            await conn.commit()
    
    async def get_campaign(self, campaign_id: int) -> Optional[Campaign]:
        """Busca campanha por ID"""
        async with self.get_connection() as conn:
            async with conn.execute(
                "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return Campaign(**dict(row))
                return None
    
    async def get_campaigns(self, status: Optional[CampaignStatus] = None) -> List[Campaign]:
        """Lista campanhas, opcionalmente filtradas por status"""
        async with self.get_connection() as conn:
            if status:
                cursor = await conn.execute(
                    "SELECT * FROM campaigns WHERE status = ? ORDER BY created_at DESC",
                    (status.value,)
                )
            else:
                cursor = await conn.execute(
                    "SELECT * FROM campaigns ORDER BY created_at DESC"
                )
            
            rows = await cursor.fetchall()
            return [Campaign(**dict(row)) for row in rows]
    
    async def update_campaign_status(self, campaign_id: int, status: CampaignStatus):
        """Atualiza status da campanha"""
        async with self.get_connection() as conn:
            if status == CampaignStatus.RUNNING:
                await conn.execute("""
                    UPDATE campaigns 
                    SET status = ?, started_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (status.value, campaign_id))
            elif status in [CampaignStatus.COMPLETED, CampaignStatus.CANCELLED]:
                await conn.execute("""
                    UPDATE campaigns 
                    SET status = ?, completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (status.value, campaign_id))
            else:
                await conn.execute("""
                    UPDATE campaigns SET status = ? WHERE id = ?
                """, (status.value, campaign_id))
            
            await conn.commit()
    
    async def update_campaign_counts(self, campaign_id: int):
        """Atualiza contagens de envio da campanha"""
        async with self.get_connection() as conn:
            await conn.execute("""
                UPDATE campaigns 
                SET sent_count = (SELECT COUNT(*) FROM messages WHERE campaign_id = ? AND status = 'sent'),
                    failed_count = (SELECT COUNT(*) FROM messages WHERE campaign_id = ? AND status = 'failed'),
                    pending_count = (SELECT COUNT(*) FROM messages WHERE campaign_id = ? AND status = 'pending')
                WHERE id = ?
            """, (campaign_id, campaign_id, campaign_id, campaign_id))
            await conn.commit()
    
    async def get_pending_messages(self, campaign_id: int, limit: int = 100) -> List[Message]:
        """Busca mensagens pendentes da campanha"""
        async with self.get_connection() as conn:
            cursor = await conn.execute("""
                SELECT * FROM messages 
                WHERE campaign_id = ? AND status = 'pending'
                ORDER BY id
                LIMIT ?
            """, (campaign_id, limit))
            
            rows = await cursor.fetchall()
            return [Message(**dict(row)) for row in rows]
    
    async def update_message_status(self, message_id: int, status: MessageStatus,
                                   error_message: Optional[str] = None):
        """Atualiza status de uma mensagem"""
        async with self.get_connection() as conn:
            if status == MessageStatus.SENT:
                await conn.execute("""
                    UPDATE messages 
                    SET status = ?, sent_at = CURRENT_TIMESTAMP, attempt_count = attempt_count + 1
                    WHERE id = ?
                """, (status.value, message_id))
            else:
                await conn.execute("""
                    UPDATE messages 
                    SET status = ?, error_message = ?, attempt_count = attempt_count + 1
                    WHERE id = ?
                """, (status.value, error_message, message_id))
            
            await conn.commit()
    
    async def get_messages_stats(self, campaign_id: int) -> Dict[str, int]:
        """Retorna estatísticas de mensagens da campanha"""
        async with self.get_connection() as conn:
            cursor = await conn.execute("""
                SELECT status, COUNT(*) as count 
                FROM messages 
                WHERE campaign_id = ?
                GROUP BY status
            """, (campaign_id,))
            
            rows = await cursor.fetchall()
            stats = {'total': 0, 'pending': 0, 'sent': 0, 'failed': 0, 'sending': 0}
            
            for row in rows:
                stats[row['status']] = row['count']
                stats['total'] += row['count']
            
            return stats
    
    async def get_messages(self, campaign_id: int, status: Optional[MessageStatus] = None,
                          limit: int = 100, offset: int = 0) -> List[Message]:
        """Lista mensagens da campanha"""
        async with self.get_connection() as conn:
            if status:
                cursor = await conn.execute("""
                    SELECT * FROM messages 
                    WHERE campaign_id = ? AND status = ?
                    ORDER BY id
                    LIMIT ? OFFSET ?
                """, (campaign_id, status.value, limit, offset))
            else:
                cursor = await conn.execute("""
                    SELECT * FROM messages 
                    WHERE campaign_id = ?
                    ORDER BY id
                    LIMIT ? OFFSET ?
                """, (campaign_id, limit, offset))
            
            rows = await cursor.fetchall()
            return [Message(**dict(row)) for row in rows]
    
    async def delete_campaign(self, campaign_id: int):
        """Remove campanha e suas mensagens"""
        async with self.get_connection() as conn:
            await conn.execute("DELETE FROM messages WHERE campaign_id = ?", (campaign_id,))
            await conn.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
            await conn.commit()
    
    async def cleanup_old_data(self, hours: int = 24):
        """Remove dados antigos baseado na configuração"""
        if not settings.CLEANUP_AFTER_FINISH:
            return
        
        cutoff = datetime.now() - timedelta(hours=hours)
        
        async with self.get_connection() as conn:
            # Remover campanhas concluídas/canceladas antigas
            await conn.execute("""
                DELETE FROM messages 
                WHERE campaign_id IN (
                    SELECT id FROM campaigns 
                    WHERE status IN ('completed', 'cancelled')
                    AND completed_at < ?
                )
            """, (cutoff,))
            
            await conn.execute("""
                DELETE FROM campaigns 
                WHERE status IN ('completed', 'cancelled')
                AND completed_at < ?
            """, (cutoff,))
            
            await conn.commit()
    
    async def reset_database(self):
        """Remove todas as tabelas e recria (uso com cautela!)"""
        async with self.get_connection() as conn:
            await conn.execute("DROP TABLE IF EXISTS messages")
            await conn.execute("DROP TABLE IF EXISTS campaigns")
            await conn.commit()
        
        await self.initialize()


# Instância global
db = Database()