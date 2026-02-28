# ========================================
# AVADMIN - Internal API Schemas
# ========================================

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# ==========================================
# USER SCHEMAS
# ==========================================

class UserInfo(BaseModel):
    """User info for JWT tokens and auth contexts"""
    id: str
    full_name: str
    cpf: str
    whatsapp: Optional[str] = None
    role: str
    account_id: Optional[str] = None
    is_active: bool = True
    whatsapp_verified: bool = False
    client_type: Optional[str] = None
    enabled_modules: List[str] = []
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User response for internal APIs"""
    id: str
    full_name: str
    cpf: str
    whatsapp: str
    role: str
    account_id: Optional[str] = None
    is_active: bool
    whatsapp_verified: bool
    client_type: Optional[str] = None
    enabled_modules: List[str] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    """List of users response"""
    users: List[UserResponse]
    total: int

# ==========================================
# ACCOUNT SCHEMAS
# ==========================================

class AccountLimits(BaseModel):
    """Account usage limits and current usage"""
    max_users: int
    max_products: int
    max_transactions: int
    current_users: int
    current_products: int
    current_transactions: int
    
    @property
    def users_percentage(self) -> float:
        if self.max_users == 0:
            return 0.0
        return (self.current_users / self.max_users) * 100
    
    @property
    def products_percentage(self) -> float:
        if self.max_products == 0:
            return 0.0
        return (self.current_products / self.max_products) * 100
    
    @property
    def transactions_percentage(self) -> float:
        if self.max_transactions == 0:
            return 0.0
        return (self.current_transactions / self.max_transactions) * 100

class PlanResponse(BaseModel):
    """Plan response for internal APIs"""
    id: str
    name: str
    max_users: int
    max_products: int
    max_transactions: int
    features: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True

class AccountResponse(BaseModel):
    """Account/Company response for internal APIs"""
    id: str
    company_name: str
    cnpj: str
    whatsapp: str
    responsible_name: str
    status: str
    enabled_modules: List[str]
    plan: Optional[PlanResponse] = None
    limits: AccountLimits
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==========================================
# PERMISSION SCHEMAS
# ==========================================

class ModulePermissionResponse(BaseModel):
    """Module permission check response"""
    account_id: str
    module: str
    has_access: bool
    reason: str

# ==========================================
# VALIDATION SCHEMAS
# ==========================================

class UserAccessValidationRequest(BaseModel):
    """User access validation request"""
    user_id: str
    module: str

class UserAccessValidationResponse(BaseModel):
    """User access validation response"""
    has_access: bool
    reason: str

# ==========================================
# USAGE COUNTER SCHEMAS
# ==========================================

class UsageCounterRequest(BaseModel):
    """Usage counter increment request"""
    counter_type: str = Field(..., description="Type: users, products, transactions")

class UsageCounterResponse(BaseModel):
    """Usage counter response"""
    success: bool
    message: str
    current_usage: Optional[int] = None
    limit: Optional[int] = None
    percentage: Optional[float] = None

# ==========================================
# HEALTH CHECK SCHEMAS
# ==========================================

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    module: str
    database: str
    version: str
    timestamp: Optional[datetime] = None