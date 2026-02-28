# ========================================
# AVADMIN - Configuration Settings
# ========================================

import os
from typing import Optional, List
import json
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator

class Settings(BaseSettings):
    """Application settings for AvAdmin"""
    
    # ========================================
    # DATABASE CONFIGURATION (NEON - AVADMIN/AUTH)
    # ========================================
    
    # Neon PostgreSQL connection (AvAdmin + Auth centralizado)
    database_url: str = Field(
        default="postgresql+asyncpg://neondb_owner:npg_pY5C0lHhARfx@ep-muddy-bread-acs8josc-pooler.sa-east-1.aws.neon.tech/neondb?ssl=require",
        env="AVADMIN_DATABASE_URL",
        description="Neon PostgreSQL connection for AvAdmin/Auth"
    )
    
    # Database pool settings
    database_pool_size: int = Field(default=5, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=10, env="DATABASE_MAX_OVERFLOW")
    database_pool_timeout: int = Field(default=30, env="DATABASE_POOL_TIMEOUT")
    
    # ========================================
    # REDIS CONFIGURATION
    # ========================================
    
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # ========================================
    # JWT & SECURITY
    # ========================================
    
    jwt_secret: str = Field(
        default="7e8b3e0b9569e981108237b28f79e689484de500f9505ed3d93c60e7657f00c5",
        env="JWT_SECRET"
    )
    jwt_expire_days: int = Field(default=7, env="JWT_EXPIRE_DAYS")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    
    bcrypt_rounds: int = Field(default=12, env="BCRYPT_ROUNDS")
    
    # ========================================
    # WHATSAPP BUSINESS API
    # ========================================
    
    whatsapp_api_token: Optional[str] = Field(default=None, env="WHATSAPP_API_TOKEN")
    whatsapp_business_account_id: Optional[str] = Field(default=None, env="WHATSAPP_BUSINESS_ACCOUNT_ID")
    whatsapp_phone_number_id: Optional[str] = Field(default=None, env="WHATSAPP_PHONE_NUMBER_ID")
    whatsapp_default_number: str = Field(default="5511999999999", env="WHATSAPP_DEFAULT_NUMBER")
    
    # WhatsApp rate limiting
    whatsapp_max_retries: int = Field(default=3, env="WHATSAPP_MAX_RETRIES")
    whatsapp_timeout: int = Field(default=30, env="WHATSAPP_TIMEOUT")
    
    # ========================================
    # WPPCONNECT CONFIGURATION
    # ========================================
    
    use_wppconnect: bool = Field(default=False, env="USE_WPPCONNECT")
    wppconnect_url: str = Field(default="http://localhost:21465", env="WPPCONNECT_URL")
    wppconnect_secret: str = Field(default="avelar-wpp-secret", env="WPPCONNECT_SECRET")
    wppconnect_session: str = Field(default="avelar-session", env="WPPCONNECT_SESSION")
    
    # ========================================
    # APPLICATION SETTINGS
    # ========================================
    
    app_name: str = Field(default="AvAdmin", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    
    @field_validator('debug', mode='before')
    @classmethod
    def parse_debug(cls, v):
        """Parse debug value, handling empty strings and various formats"""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            if v.lower() in ('true', '1', 'yes', 'on'):
                return True
            if v.lower() in ('false', '0', 'no', 'off', ''):
                return False
        return False
    
    # ========================================
    # CORS SETTINGS
    # ========================================
    
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3001",
            "http://localhost:3000", 
            "https://avadmin.avelarcompany.com.br",
            "https://stocktech.avelarcompany.com.br",
            "https://app.avelarcompany.com.br"
        ],
        env="CORS_ORIGINS"
    )

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return []
            if raw.startswith('['):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in raw.split(',') if item.strip()]
        return []
    
    # ========================================
    # RATE LIMITING
    # ========================================
    
    rate_limit_per_minute: int = Field(default=1000, env="RATE_LIMIT_PER_MINUTE")
    rate_limit_burst: int = Field(default=100, env="RATE_LIMIT_BURST")
    
    # ========================================
    # LOGGING
    # ========================================
    
    log_level: str = Field(default="DEBUG", env="LOG_LEVEL")
    
    # ========================================
    # EXTERNAL APIS
    # ========================================
    
    mercadopago_access_token: Optional[str] = Field(default=None, env="MERCADOPAGO_ACCESS_TOKEN")
    mercadopago_public_key: Optional[str] = Field(default=None, env="MERCADOPAGO_PUBLIC_KEY")
    mercadopago_webhook_secret: Optional[str] = Field(default=None, env="MERCADOPAGO_WEBHOOK_SECRET")
    
    # ========================================
    # VALIDATION
    # ========================================
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment.lower() == "production"
    
    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL (for Alembic)"""
        url = self.database_url.replace("+asyncpg", "")
        if "ssl=true" in url:
            url = url.replace("ssl=true", "sslmode=require&channel_binding=require")
        return url
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False
    }

# Global settings instance
settings = Settings()