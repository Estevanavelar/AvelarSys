from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MessageStatus(str, Enum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class CampaignStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ERROR = "error"


class Contact(BaseModel):
    phone: str = Field(..., description="Número de telefone")
    variables: Dict[str, str] = Field(default_factory=dict, description="Variáveis para template")
    
    class Config:
        json_schema_extra = {
            "example": {
                "phone": "5511999999999",
                "variables": {"nome": "João", "empresa": "ABC"}
            }
        }


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    message_template: str = Field(..., min_length=1, description="Template da mensagem com placeholders {var}")
    delay_min: int = Field(default=5, ge=1, le=300)
    delay_max: int = Field(default=15, ge=1, le=300)
    max_per_hour: int = Field(default=50, ge=1, le=500)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Campanha Janeiro",
                "message_template": "Olá! Temos uma promoção especial para você!",
                "delay_min": 5,
                "delay_max": 15,
                "max_per_hour": 50
            }
        }


class Campaign(BaseModel):
    id: int
    name: str
    message_template: str
    status: CampaignStatus
    total_contacts: int
    sent_count: int
    failed_count: int
    pending_count: int
    delay_min: int
    delay_max: int
    max_per_hour: int
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class Message(BaseModel):
    id: int
    campaign_id: int
    phone: str
    message: str
    status: MessageStatus
    attempt_count: int
    error_message: Optional[str]
    sent_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CampaignStats(BaseModel):
    campaign_id: int
    name: str
    status: CampaignStatus
    total: int
    sent: int
    failed: int
    pending: int
    progress_percent: float
    estimated_completion: Optional[datetime]
    average_delay: float
    

class WPPStatus(BaseModel):
    connected: bool
    status: str
    qr_code_available: bool
    uptime: float


class SystemStatus(BaseModel):
    campaigns_running: int
    campaigns_total: int
    messages_sent_today: int
    wpp_status: WPPStatus
    queue_size: int
    

class UploadResponse(BaseModel):
    success: bool
    filename: str
    contacts_count: int
    errors: List[str] = Field(default_factory=list)


class BulkSendRequest(BaseModel):
    campaign_id: int
    contacts: List[Contact]


class TemplateVariable(BaseModel):
    name: str
    description: str
    example: str
