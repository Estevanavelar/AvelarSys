# ========================================
# AVADMIN - User Models (WhatsApp-First)
# ========================================

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String, DateTime, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base
from .account import ClientType

class UserRole(str, enum.Enum):
    """User roles in the system"""
    super_admin = "super_admin"      # System administrator
    admin = "admin"                  # Company administrator
    manager = "manager"              # Manager
    user = "user"                    # Regular user
    viewer = "viewer"                # Read-only access
    
    # Aliases para compatibilidade
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"

class User(Base):
    """
    User model - WhatsApp-First authentication
    Login with CPF, contact via WhatsApp only
    """
    __tablename__ = "users"
    
    # Identity & Authentication
    id = Column(String(11), primary_key=True, index=True)  # CPF como PK
    full_name = Column(String(100), nullable=False, index=True)
    cpf = Column(String(11), unique=True, nullable=False, index=True)  # Login field
    whatsapp = Column(String(15), nullable=False, index=True)  # +5511999999999
    password_hash = Column(String(255), nullable=False)
    
    # Company relationship
    account_id = Column(
        String(14),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=True,  # Super admin has no account
        index=True
    )
    
    # Role and permissions
    role = Column(
        Enum(UserRole, name="user_role", create_type=False),
        default=UserRole.user,
        nullable=False
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Client type (cliente, lojista, distribuidor, admin)
    client_type = Column(
        Enum(ClientType, name="client_type", create_type=False),
        nullable=True
    )

    # Enabled modules for this user (optional override)
    enabled_modules = Column(
        JSONB,
        nullable=True,
        comment="List of enabled modules per user: ['StockTech', 'Lucrum']"
    )

    # Global customer devices (shared across modules by CPF)
    devices = Column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
        default=list,
        comment="List of customer devices linked to this CPF"
    )
    
    # WhatsApp verification
    whatsapp_verified = Column(Boolean, default=False, nullable=False)

    # Additional user fields
    birth_date = Column(DateTime(timezone=False), nullable=True)
    complement = Column(String(100), nullable=True)  # Complemento endereco
    zip_code = Column(String(8), nullable=True)
    address_number = Column(String(20), nullable=True)
    address_neighborhood = Column(String(100), nullable=True)
    reference_point = Column(String, nullable=True)
    store_name = Column(String(100), nullable=True)
    logo_url = Column(String, nullable=True)
    facade_photo_url = Column(String, nullable=True)

    # Campos de endereco completo (para registro unificado)
    address_street = Column(String(200), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(2), nullable=True)
    
    # Login tracking
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0, nullable=False)
    
    # Relationships (will be defined after all models are loaded)
    # account = relationship("Account", back_populates="users")
    
    def __repr__(self):
        return f"<User {self.full_name} ({self.cpf})>"
    
    @property
    def is_super_admin(self) -> bool:
        """Check if user is super admin"""
        return self.role == UserRole.SUPER_ADMIN
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin or super admin"""
        return self.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    
    @property
    def masked_cpf(self) -> str:
        """Return masked CPF: 123.456.789-00"""
        cpf = self.cpf
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    
    @property
    def formatted_whatsapp(self) -> str:
        """Return formatted WhatsApp: +55 (11) 99999-9999"""
        phone = self.whatsapp.replace("+", "")
        if len(phone) == 13:  # 5511999999999
            return f"+{phone[:2]} ({phone[2:4]}) {phone[4:9]}-{phone[9:]}"
        return self.whatsapp
    
    def can_access_module(self, module_name: str) -> bool:
        """Check if user can access specific module"""
        if not self.account:
            return self.is_super_admin  # Super admin can access everything

        if self.enabled_modules is not None:
            return module_name in (self.enabled_modules or [])

        return module_name in (self.account.enabled_modules or [])
    
    def set_verification_code(self, code: str, expires_at: datetime):
        """Set WhatsApp verification code"""
        self.verification_code = code
        self.verification_expires = expires_at
        self.whatsapp_verified = False
    
    def verify_code(self, code: str) -> bool:
        """Verify WhatsApp code"""
        if not self.verification_code or not self.verification_expires:
            return False
        
        if datetime.utcnow() > self.verification_expires:
            return False  # Code expired
        
        if self.verification_code != code:
            return False  # Wrong code
        
        # Code is valid
        self.whatsapp_verified = True
        self.verification_code = None
        self.verification_expires = None
        return True