# ========================================
# AVADMIN - Account Models (SaaS Companies)
# ========================================

import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, Column, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base

class AccountStatus(str, enum.Enum):
    """Account status in the SaaS system"""
    active = "active"                # Active subscription
    suspended = "suspended"          # Temporarily suspended
    cancelled = "cancelled"          # Cancelled subscription
    trial = "trial"                  # Trial period
    pending = "pending"              # Awaiting verification
    
    # Aliases for compatibility
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    TRIAL = "trial"
    PENDING = "pending"

class ClientType(str, enum.Enum):
    """Type of client/account in the system"""
    cliente = "cliente"              # Cliente final (pessoa física)
    lojista = "lojista"              # Lojista/comerciante
    distribuidor = "distribuidor"    # Distribuidor/atacadista
    admin = "admin"                  # Conta administrativa interna

    # Aliases for compatibility
    CLIENTE = "cliente"
    LOJISTA = "lojista"
    DISTRIBUIDOR = "distribuidor"
    ADMIN = "admin"

class DocumentType(str, enum.Enum):
    """Document type for accounts"""
    cpf = "cpf"                      # Pessoa física
    cnpj = "cnpj"                    # Pessoa jurídica

    # Aliases for compatibility
    CPF = "cpf"
    CNPJ = "cnpj"

class Account(Base):
    """
    Account model - SaaS Companies/Organizations
    Each account represents a company using the SaaS
    """
    __tablename__ = "accounts"
    
    # Company Information
    id = Column(String(14), primary_key=True, index=True)  # CPF ou CNPJ como PK
    document = Column(String(14), nullable=False, index=True)  # Documento sem formatação
    document_type = Column(
        Enum(DocumentType, name="document_type", create_type=False),
        nullable=False,
        default=DocumentType.cnpj
    )
    is_individual = Column(Boolean, default=False, nullable=False)
    company_name = Column(String(100), nullable=False, index=True)
    responsible_name = Column(String(100), nullable=False)  # Legal representative
    previous_document = Column(String(14), nullable=True)  # Para migração CPF→CNPJ
    
    # Owner CPF - CPF do dono da empresa para multi-tenancy
    owner_cpf = Column(
        String(11),
        nullable=True,
        index=True,
        comment="CPF do dono/responsável legal da empresa para filtros multi-tenancy"
    )
    
    # Contact Information (WhatsApp-First)
    whatsapp = Column(String(15), nullable=False, index=True)  # Company WhatsApp
    whatsapp_verified = Column(Boolean, default=False, nullable=False)
    
    # Additional Info
    address = Column(Text, nullable=True)
    complement = Column(String(100), nullable=True)  # Complemento endereco
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)  # SP, RJ, etc.
    zip_code = Column(String(8), nullable=True)  # CEP
    
    # SaaS Configuration
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    status = Column(
        Enum(AccountStatus, name="account_status", create_type=False),
        default=AccountStatus.trial,
        nullable=False
    )
    
    # Client type (cliente, lojista, distribuidor, admin)
    client_type = Column(
        Enum(ClientType, name="client_type", create_type=False),
        default=ClientType.lojista,
        nullable=False
    )
    
    # Enabled modules for this account
    enabled_modules = Column(
        JSONB,
        default=list,
        nullable=False,
        comment="List of enabled modules: ['StockTech', 'Lucrum']"
    )
    
    # Trial and billing
    trial_ends_at = Column(String, nullable=True)  # Trial expiration
    # TODO: billing_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Dono para faturamento
    
    # Usage limits (from plan)
    max_users = Column(String, default="1", nullable=False)
    max_products = Column(String, default="100", nullable=False) 
    max_transactions = Column(String, default="500", nullable=False)
    
    # Current usage counters
    current_users = Column(String, default="0", nullable=False)
    current_products = Column(String, default="0", nullable=False)
    current_transactions_month = Column(String, default="0", nullable=False)
    
    # Settings and customization
    settings = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="Company-specific settings and preferences"
    )
    
    # Relationships (will be defined after all models are loaded)
    # plan = relationship("Plan", back_populates="accounts")
    # users = relationship("User", back_populates="account", cascade="all, delete-orphan")  
    # billing_transactions = relationship("BillingTransaction", back_populates="account", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Account {self.company_name} ({self.document})>"
    
    @property
    def is_active(self) -> bool:
        """Check if account is active"""
        return self.status == AccountStatus.ACTIVE
    
    @property
    def is_trial(self) -> bool:
        """Check if account is in trial"""
        return self.status == AccountStatus.TRIAL
    
    @property
    def formatted_document(self) -> str:
        """Return formatted document based on type (CPF or CNPJ)"""
        doc = self.document
        if not doc:
            return ""
        if self.document_type == DocumentType.cnpj and len(doc) == 14:
            return f"{doc[:2]}.{doc[2:5]}.{doc[5:8]}/{doc[8:12]}-{doc[12:]}"
        elif self.document_type == DocumentType.cpf and len(doc) == 11:
            return f"{doc[:3]}.{doc[3:6]}.{doc[6:9]}-{doc[9:]}"
        return doc
    
    @property
    def formatted_owner_cpf(self) -> str:
        """Return formatted owner CPF: 123.456.789-00"""
        if not self.owner_cpf:
            return ""
        cpf = self.owner_cpf
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    
    @property
    def formatted_whatsapp(self) -> str:
        """Return formatted WhatsApp: +55 (11) 99999-9999"""
        phone = self.whatsapp.replace("+", "")
        if len(phone) == 13:  # 5511999999999
            return f"+{phone[:2]} ({phone[2:4]}) {phone[4:9]}-{phone[9:]}"
        return self.whatsapp
    
    def has_module_enabled(self, module_name: str) -> bool:
        """Check if specific module is enabled"""
        return module_name in (self.enabled_modules or [])
    
    def enable_module(self, module_name: str):
        """Enable a module for this account"""
        if not self.enabled_modules:
            self.enabled_modules = []
        
        if module_name not in self.enabled_modules:
            self.enabled_modules.append(module_name)
    
    def disable_module(self, module_name: str):
        """Disable a module for this account"""
        if self.enabled_modules and module_name in self.enabled_modules:
            self.enabled_modules.remove(module_name)
    
    def can_create_user(self) -> bool:
        """Check if account can create more users"""
        return int(self.current_users) < int(self.max_users)
    
    def can_create_product(self) -> bool:
        """Check if account can create more products"""
        return int(self.current_products) < int(self.max_products)
    
    def can_create_transaction(self) -> bool:
        """Check if account can create more transactions this month"""
        return int(self.current_transactions_month) < int(self.max_transactions)
    
    def increment_usage(self, counter_type: str):
        """Increment usage counter"""
        if counter_type == "users":
            self.current_users = str(int(self.current_users) + 1)
        elif counter_type == "products":
            self.current_products = str(int(self.current_products) + 1)
        elif counter_type == "transactions":
            self.current_transactions_month = str(int(self.current_transactions_month) + 1)
    
    def get_usage_percentage(self, counter_type: str) -> float:
        """Get usage percentage for a specific counter"""
        current_map = {
            "users": (self.current_users, self.max_users),
            "products": (self.current_products, self.max_products),
            "transactions": (self.current_transactions_month, self.max_transactions)
        }
        
        if counter_type not in current_map:
            return 0.0
        
        current, max_val = current_map[counter_type]
        if int(max_val) == 0:
            return 0.0
        
        return (int(current) / int(max_val)) * 100