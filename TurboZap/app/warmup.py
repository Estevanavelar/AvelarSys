"""
Sistema de Warm-up de Chip para WhatsApp

Controla o aquecimento gradual de chips novos para evitar banimentos.
Limites progressivos baseados na "idade" do chip em dias.

Limites:
- Dia 1-3: máx 5 mensagens/dia
- Dia 4-7: máx 15 mensagens/dia
- Dia 8-14: máx 30 mensagens/dia
- Dia 15+: limite configurável (padrão 40/dia)
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
from app.database import db


class WarmUpManager:
    """Gerenciador de warm-up de chips"""
    
    # Limites progressivos por dia de idade do chip
    WARMUP_LIMITS = {
        0: 5,    # Dia 0 (primeira conexão)
        1: 5,    # Dia 1
        2: 5,    # Dia 2
        3: 5,    # Dia 3
        4: 15,   # Dia 4
        5: 15,   # Dia 5
        6: 15,   # Dia 6
        7: 15,   # Dia 7
        8: 30,   # Dia 8
        9: 30,   # Dia 9
        10: 30,  # Dia 10
        11: 30,  # Dia 11
        12: 30,  # Dia 12
        13: 30,  # Dia 13
        14: 30,  # Dia 14
    }
    
    DEFAULT_LIMIT = 40  # Após dia 14
    
    def __init__(self):
        self._initialized = False
    
    async def initialize(self):
        """Inicializa tabela de warm-up no banco"""
        if self._initialized:
            return
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS chip_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instance_name TEXT UNIQUE NOT NULL,
                first_connected_at TIMESTAMP,
                daily_limit INTEGER DEFAULT 5,
                messages_sent_today INTEGER DEFAULT 0,
                last_reset_date TEXT,
                is_warm BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self._initialized = True
    
    def _get_chip_age_days(self, first_connected_at: Optional[datetime]) -> int:
        """Calcula idade do chip em dias"""
        if not first_connected_at:
            return 0
        
        now = datetime.now()
        delta = now - first_connected_at
        return delta.days
    
    def _get_daily_limit(self, age_days: int) -> int:
        """Retorna limite diário baseado na idade do chip"""
        if age_days in self.WARMUP_LIMITS:
            return self.WARMUP_LIMITS[age_days]
        elif age_days < 0:
            return 0
        else:
            return self.DEFAULT_LIMIT
    
    async def register_connection(self, instance_name: str) -> Dict:
        """
        Registra primeira conexão de um chip
        
        Returns:
            Dict com status do chip
        """
        await self.initialize()
        
        now = datetime.now()
        today = now.strftime('%Y-%m-%d')
        
        # Verificar se já existe
        existing = await db.fetch_one(
            "SELECT * FROM chip_status WHERE instance_name = ?",
            (instance_name,)
        )
        
        if existing:
            # Já existe, apenas retornar status
            return await self.get_chip_status(instance_name)
        
        # Criar novo registro
        await db.execute(
            """INSERT INTO chip_status 
                (instance_name, first_connected_at, daily_limit, last_reset_date, is_warm)
                VALUES (?, ?, ?, ?, ?)""",
            (instance_name, now, 5, today, False)
        )
        
        return {
            "instance_name": instance_name,
            "age_days": 0,
            "daily_limit": 5,
            "messages_sent_today": 0,
            "remaining": 5,
            "is_warm": False,
            "is_new": True
        }
    
    async def get_chip_status(self, instance_name: str) -> Optional[Dict]:
        """
        Obtém status do chip
        
        Returns:
            Dict com informações do chip ou None se não encontrado
        """
        await self.initialize()
        
        row = await db.fetch_one(
            "SELECT * FROM chip_status WHERE instance_name = ?",
            (instance_name,)
        )
        
        if not row:
            return None
        
        # Verificar se precisa resetar contador diário
        today = datetime.now().strftime('%Y-%m-%d')
        if row['last_reset_date'] != today:
            await self._reset_daily_counter(instance_name)
            row['messages_sent_today'] = 0
            row['last_reset_date'] = today
        
        # Calcular idade e limites
        first_connected = row['first_connected_at']
        if isinstance(first_connected, str):
            first_connected = datetime.fromisoformat(first_connected)
        
        age_days = self._get_chip_age_days(first_connected)
        daily_limit = self._get_daily_limit(age_days)
        
        # Atualizar limite se mudou
        if daily_limit != row['daily_limit']:
            await db.execute(
                "UPDATE chip_status SET daily_limit = ? WHERE instance_name = ?",
                (daily_limit, instance_name)
            )
        
        # Verificar se já está aquecido (15+ dias)
        is_warm = age_days >= 15
        if is_warm != row['is_warm']:
            await db.execute(
                "UPDATE chip_status SET is_warm = ? WHERE instance_name = ?",
                (is_warm, instance_name)
            )
        
        return {
            "instance_name": instance_name,
            "age_days": age_days,
            "daily_limit": daily_limit,
            "messages_sent_today": row['messages_sent_today'],
            "remaining": max(0, daily_limit - row['messages_sent_today']),
            "is_warm": is_warm,
            "first_connected_at": first_connected,
            "is_new": False
        }
    
    async def _reset_daily_counter(self, instance_name: str):
        """Reseta contador diário"""
        today = datetime.now().strftime('%Y-%m-%d')
        await db.execute(
            """UPDATE chip_status 
                SET messages_sent_today = 0, last_reset_date = ?
                WHERE instance_name = ?""",
            (today, instance_name)
        )
    
    async def can_send(self, instance_name: str) -> Dict:
        """
        Verifica se pode enviar mensagem
        
        Returns:
            Dict com allowed (bool), reason (str), status (dict)
        """
        await self.initialize()
        
        status = await self.get_chip_status(instance_name)
        
        if not status:
            # Chip não registrado, registrar agora
            status = await self.register_connection(instance_name)
        
        if status['remaining'] <= 0:
            return {
                "allowed": False,
                "reason": f"Limite diário atingido ({status['daily_limit']} mensagens). Aguarde até amanhã.",
                "status": status
            }
        
        return {
            "allowed": True,
            "reason": None,
            "status": status
        }
    
    async def record_send(self, instance_name: str) -> Dict:
        """
        Registra envio de mensagem
        
        Returns:
            Dict com status atualizado
        """
        await self.initialize()
        
        await db.execute(
            """UPDATE chip_status 
                SET messages_sent_today = messages_sent_today + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE instance_name = ?""",
            (instance_name,)
        )
        
        return await self.get_chip_status(instance_name)
    
    async def get_all_chips(self) -> list:
        """Retorna status de todos os chips"""
        await self.initialize()
        
        rows = await db.fetch_all("SELECT instance_name FROM chip_status")
        chips = []
        
        for row in rows:
            status = await self.get_chip_status(row['instance_name'])
            if status:
                chips.append(status)
        
        return chips


# Instância global
warmup_manager = WarmUpManager()
