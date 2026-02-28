import os
import yaml
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, BaseModel


class SmartDelayConfig(BaseModel):
    """Configuração para delays humanizados (smart delay)."""
    message_delay_min: int = 15
    message_delay_max: int = 45
    short_break_every: List[int] = [8, 12]
    short_break_duration: List[int] = [120, 300]
    long_break_every: List[int] = [30, 50]
    long_break_duration: List[int] = [600, 1200]
    business_hours_start: int = 8
    business_hours_end: int = 20
    respect_business_hours: bool = True
    message_length_factor: float = 0.05


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TurboZap"
    APP_ENV: str = "production"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///app/data/turbozap.db"
    CLEANUP_AFTER_FINISH: bool = True
    CLEANUP_INTERVAL_HOURS: int = 24
    
    # WPPConnect
    WPP_HOST: str = "http://avelarsys-wpp:8003"
    WPP_FALLBACK_HOSTS: str = ""  # Separado por vírgula
    WPP_TIMEOUT: int = 30
    WPP_HEALTH_CHECK_INTERVAL: int = 60
    
    # Rate Limiting
    MAX_MSG_PER_HOUR: int = 50
    MAX_MSG_PER_SECOND: int = 1
    BURST_LIMIT: int = 5
    
    # Delay
    DEFAULT_DELAY_MIN: int = 5
    DEFAULT_DELAY_MAX: int = 15
    
    # Retry
    MAX_RETRY_ATTEMPTS: int = 3
    RETRY_DELAY_SECONDS: int = 30
    
    # Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = Field(default=["csv", "txt", "vcf"])
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_RETENTION_DAYS: int = 7
    
    # Security
    API_KEY_HEADER: str = "X-API-Key"

    # Smart delay (anti-ban)
    smart_delay: SmartDelayConfig = SmartDelayConfig()
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def wpp_hosts(self) -> List[str]:
        """Retorna lista de hosts WPPConnect disponíveis"""
        hosts = [self.WPP_HOST]
        if self.WPP_FALLBACK_HOSTS:
            hosts.extend([h.strip() for h in self.WPP_FALLBACK_HOSTS.split(",")])
        return hosts


# Carregar configuração do YAML se existir
def load_yaml_config() -> dict:
    config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


# Instância global de configurações
settings = Settings()

# Atualizar com valores do YAML
yaml_config = load_yaml_config()
if yaml_config:
    if "rate_limits" in yaml_config:
        settings.MAX_MSG_PER_HOUR = yaml_config["rate_limits"].get("max_per_hour", settings.MAX_MSG_PER_HOUR)
        settings.MAX_MSG_PER_SECOND = yaml_config["rate_limits"].get("max_per_second", settings.MAX_MSG_PER_SECOND)
    
    if "delay" in yaml_config:
        settings.DEFAULT_DELAY_MIN = yaml_config["delay"].get("min", settings.DEFAULT_DELAY_MIN)
        settings.DEFAULT_DELAY_MAX = yaml_config["delay"].get("max", settings.DEFAULT_DELAY_MAX)

    if "retry" in yaml_config:
        settings.MAX_RETRY_ATTEMPTS = yaml_config["retry"].get("max_attempts", settings.MAX_RETRY_ATTEMPTS)
        settings.RETRY_DELAY_SECONDS = yaml_config["retry"].get("delay_between", settings.RETRY_DELAY_SECONDS)

    if "smart_delay" in yaml_config:
        sd = yaml_config["smart_delay"]
        settings.smart_delay = SmartDelayConfig(
            message_delay_min=sd.get("message_delay_min", settings.smart_delay.message_delay_min),
            message_delay_max=sd.get("message_delay_max", settings.smart_delay.message_delay_max),
            short_break_every=sd.get("short_break_every", settings.smart_delay.short_break_every),
            short_break_duration=sd.get("short_break_duration", settings.smart_delay.short_break_duration),
            long_break_every=sd.get("long_break_every", settings.smart_delay.long_break_every),
            long_break_duration=sd.get("long_break_duration", settings.smart_delay.long_break_duration),
            business_hours_start=sd.get("business_hours_start", settings.smart_delay.business_hours_start),
            business_hours_end=sd.get("business_hours_end", settings.smart_delay.business_hours_end),
            respect_business_hours=sd.get("respect_business_hours", settings.smart_delay.respect_business_hours),
            message_length_factor=sd.get("message_length_factor", settings.smart_delay.message_length_factor),
        )
