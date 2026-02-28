# ========================================
# AVADMIN - Models Package
# ========================================

from .base import Base

# Import models in dependency order (for migrations)
from .plan import Plan, BillingCycle, PlanType
from .account import Account, AccountStatus, ClientType, DocumentType
from .user import User, UserRole
from .verification import VerificationCode, VerificationCodeType
from .billing import BillingTransaction, TransactionStatus, PaymentMethod
from .audit import AuditLog, AuditAction

# Export all models for easy importing
__all__ = [
    # Base
    "Base",
    
    # Plan models (no dependencies)
    "Plan", 
    "BillingCycle", 
    "PlanType",
    
    # Account models (depends on Plan)
    "Account", 
    "AccountStatus",
    "ClientType",
    "DocumentType",
    
    # User models (depends on Account)
    "User",
    "UserRole",

    # Verification models (depends on User)
    "VerificationCode",
    "VerificationCodeType",
    
    # Billing models (depends on Account + Plan)
    "BillingTransaction", 
    "TransactionStatus", 
    "PaymentMethod",
    
    # Audit models (no FK dependencies)
    "AuditLog",
    "AuditAction",
]

# Model registry in correct order for migrations
MODELS = [
    Plan,           # First - no dependencies
    Account,        # Second - depends on Plan
    User,           # Third - depends on Account
    VerificationCode,  # Fourth - depends on User
    BillingTransaction,  # Fifth - depends on Account + Plan
    AuditLog,       # Last - no FK dependencies
]