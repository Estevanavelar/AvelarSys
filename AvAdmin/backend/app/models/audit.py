# ========================================
# AVADMIN - Audit & Security Models
# ========================================

import enum
from datetime import datetime
from typing import Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base

class AuditAction(str, enum.Enum):
    """Audit actions for security tracking"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    PASSWORD_RESET = "password_reset"
    MODULE_ENABLE = "module_enable"
    MODULE_DISABLE = "module_disable"
    PLAN_CHANGE = "plan_change"
    BILLING_UPDATE = "billing_update"

class AuditLog(Base):
    """
    Audit log model - Security and compliance tracking
    Tracks all important actions in the SaaS admin panel
    """
    __tablename__ = "audit_logs"
    
    # References (no FK constraints - will reference by string for now)
    user_id = Column(String(50), nullable=True, index=True)              # Who performed action
    account_id = Column(String(50), nullable=True, index=True)           # Which account affected
    
    # Action details
    action = Column(Enum(AuditAction), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)       # "user", "account", "plan"
    resource_id = Column(String(50), nullable=True, index=True)          # ID of affected resource
    
    # Change tracking
    old_values = Column(JSONB, nullable=True, comment="Previous values before change")
    new_values = Column(JSONB, nullable=True, comment="New values after change")
    
    # Request context
    ip_address = Column(String(45), nullable=True, index=True)           # IPv4/IPv6
    user_agent = Column(Text, nullable=True)                            # Browser info
    endpoint = Column(String(200), nullable=True)                       # API endpoint called
    
    # Additional context
    description = Column(Text, nullable=True)                           # Human readable description
    extra_data = Column(JSONB, default=dict, nullable=False)            # Additional context
    
    # Security flags
    is_suspicious = Column(Boolean, default=False, nullable=False)      # Flagged as suspicious
    is_admin_action = Column(Boolean, default=False, nullable=False)    # Performed by admin
    
    def __repr__(self):
        return f"<AuditLog {self.action.value} on {self.resource_type}>"
    
    @classmethod
    def create_log(
        cls,
        action: AuditAction,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        account_id: Optional[str] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        endpoint: Optional[str] = None,
        description: Optional[str] = None,
        **extra_data
    ) -> 'AuditLog':
        """Factory method to create audit log entries"""
        return cls(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            account_id=account_id,
            old_values=old_values or {},
            new_values=new_values or {},
            ip_address=ip_address,
            user_agent=user_agent,
            endpoint=endpoint,
            description=description,
            extra_data=extra_data
        )