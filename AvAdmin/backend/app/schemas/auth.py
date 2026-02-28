# ========================================
# AVADMIN - Authentication Schemas
# ========================================

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator

class UserInfo(BaseModel):
    """User information for responses"""
    id: str
    full_name: str
    cpf: str
    whatsapp: str
    role: str
    account_id: Optional[str] = None
    client_type: Optional[str] = None
    is_active: bool
    whatsapp_verified: bool
    enabled_modules: List[str] = []
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    """Login request with CPF/CNPJ + password"""
    document: str = Field(..., description="CPF ou CNPJ")
    password: str = Field(..., min_length=6, description="Senha")
    
    @validator('document')
    def validate_document(cls, v):
        from ..core.security import security
        try:
            clean_doc, doc_type = security.normalize_document(v)
            return clean_doc
        except ValueError as e:
            raise ValueError(str(e))

class LoginResponse(BaseModel):
    """Login response with token and user data"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserInfo

class RegisterAccountRequest(BaseModel):
    """Register new company account"""
    company_name: str = Field(..., max_length=100)
    cnpj: str = Field(..., description="CNPJ da empresa")
    responsible_name: str = Field(..., max_length=100, description="Nome do responsável")
    admin_cpf: Optional[str] = Field(None, description="CPF do responsável")
    whatsapp: str = Field(..., description="WhatsApp da empresa")
    password: str = Field(..., min_length=6, description="Senha")
    plan_slug: Optional[str] = Field(None, description="Plano selecionado")
    address: Optional[str] = Field(None, description="Rua/Endereço")
    address_number: Optional[str] = Field(None, description="Número")
    address_neighborhood: Optional[str] = Field(None, description="Bairro")
    complement: Optional[str] = Field(None, description="Complemento")
    city: Optional[str] = Field(None, description="Cidade")
    state: Optional[str] = Field(None, description="UF")
    zip_code: Optional[str] = Field(None, description="CEP")
    client_type: Optional[str] = Field(None, description="Tipo de cliente (cliente/lojista/distribuidor)")
    
    @validator('cnpj')
    def validate_cnpj(cls, v):
        from ..core.security import security
        try:
            clean_cnpj = security.normalize_cnpj(v)
            if not security.validate_cnpj(clean_cnpj):
                raise ValueError("CNPJ inválido")
            return clean_cnpj
        except ValueError as e:
            raise ValueError(str(e))
    
    @validator('whatsapp')
    def validate_whatsapp(cls, v):
        from ..core.security import security
        try:
            return security.normalize_whatsapp(v)
        except ValueError as e:
            raise ValueError(str(e))

    @validator('admin_cpf')
    def validate_admin_cpf(cls, v):
        if not v:
            return v
        from ..core.security import security
        try:
            clean_cpf = security.normalize_cpf(v)
            if not security.validate_cpf(clean_cpf):
                raise ValueError("CPF inválido")
            return clean_cpf
        except ValueError as e:
            raise ValueError(str(e))

class RegisterIndividualRequest(BaseModel):
    """Register individual user (CPF)"""
    full_name: str = Field(..., max_length=100)
    cpf: str = Field(..., description="CPF do usuário")
    whatsapp: str = Field(..., description="WhatsApp do usuário")
    password: str = Field(..., min_length=6, description="Senha")
    birth_date: Optional[datetime] = Field(None, description="Data de nascimento")
    address_street: Optional[str] = Field(None, description="Rua")
    address_city: Optional[str] = Field(None, description="Cidade")
    address_state: Optional[str] = Field(None, description="UF")
    address_number: Optional[str] = Field(None, description="Número")
    address_neighborhood: Optional[str] = Field(None, description="Bairro")
    complement: Optional[str] = Field(None, description="Complemento")
    zip_code: Optional[str] = Field(None, description="CEP")
    client_type: Optional[str] = Field(None, description="Tipo de cliente (cliente/lojista/distribuidor)")

    @validator('cpf')
    def validate_cpf(cls, v):
        from ..core.security import security
        try:
            clean_cpf = security.normalize_cpf(v)
            if not security.validate_cpf(clean_cpf):
                raise ValueError("CPF inválido")
            return clean_cpf
        except ValueError as e:
            raise ValueError(str(e))

    @validator('whatsapp')
    def validate_whatsapp(cls, v):
        from ..core.security import security
        try:
            return security.normalize_whatsapp(v)
        except ValueError as e:
            raise ValueError(str(e))

class RegisterUserRequest(BaseModel):
    """Register new user for existing account"""
    full_name: str = Field(..., max_length=100)
    cpf: str = Field(..., description="CPF do usuário")
    whatsapp: str = Field(..., description="WhatsApp do usuário")
    password: str = Field(..., min_length=6, description="Senha")
    
    @validator('cpf')
    def validate_cpf(cls, v):
        from ..core.security import security
        try:
            clean_cpf = security.normalize_cpf(v)
            if not security.validate_cpf(clean_cpf):
                raise ValueError("CPF inválido")
            return clean_cpf
        except ValueError as e:
            raise ValueError(str(e))
    
    @validator('whatsapp')
    def validate_whatsapp(cls, v):
        from ..core.security import security
        try:
            return security.normalize_whatsapp(v)
        except ValueError as e:
            raise ValueError(str(e))

class VerifyWhatsAppRequest(BaseModel):
    """WhatsApp verification code request"""
    cpf: str = Field(..., description="CPF do usuário")
    code: str = Field(..., min_length=6, max_length=6, description="Código de verificação")
    
    @validator('cpf')
    def validate_cpf(cls, v):
        from ..core.security import security
        try:
            return security.normalize_cpf(v)
        except ValueError as e:
            raise ValueError(str(e))

class SendVerificationRequest(BaseModel):
    """Send WhatsApp verification code"""
    cpf: str = Field(..., description="CPF do usuário")
    
    @validator('cpf')
    def validate_cpf(cls, v):
        from ..core.security import security
        try:
            return security.normalize_cpf(v)
        except ValueError as e:
            raise ValueError(str(e))

class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    document: str = Field(..., description="CPF ou CNPJ")
    
    @validator('document')
    def validate_document(cls, v):
        from ..core.security import security
        try:
            clean_doc, doc_type = security.normalize_document(v)
            return clean_doc
        except ValueError as e:
            raise ValueError(str(e))

class ResetPasswordRequest(BaseModel):
    """Reset password with verification code"""
    document: str = Field(..., description="CPF ou CNPJ")
    code: str = Field(..., min_length=6, max_length=6, description="Código de verificação")
    new_password: str = Field(..., min_length=6, description="Nova senha")
    
    @validator('document')
    def validate_document(cls, v):
        from ..core.security import security
        try:
            clean_doc, doc_type = security.normalize_document(v)
            return clean_doc
        except ValueError as e:
            raise ValueError(str(e))

class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Refresh token")

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True

class ForgotPasswordResponse(BaseModel):
    """Forgot password response with masked WhatsApp"""
    message: str
    masked_whatsapp: str
    success: bool = True

class VerificationResponse(BaseModel):
    """Verification code response"""
    message: str
    expires_in: int  # seconds
    success: bool = True