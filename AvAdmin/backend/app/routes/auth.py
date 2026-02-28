# ========================================
# AVADMIN - Authentication Routes
# ========================================

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.config import settings
from ..core.security import security
from ..models import User, Account, UserRole, AccountStatus
from ..schemas.auth import (
    LoginRequest, LoginResponse, UserInfo,
    RegisterAccountRequest, RegisterUserRequest, RegisterIndividualRequest,
    VerifyWhatsAppRequest, SendVerificationRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    MessageResponse, VerificationResponse, ForgotPasswordResponse
)
from ..services.auth import auth_service
from ..services.whatsapp import health_check as whatsapp_health_check

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Security scheme
security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    
    token = credentials.credentials
    payload = security.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login with CPF/CNPJ + password"""
    
    # Authenticate user
    user = await auth_service.authenticate_user(db, request.document, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CPF/CNPJ ou senha incorretos"
        )
    
    # Check if WhatsApp is verified (for regular users)
    if user.role != UserRole.SUPER_ADMIN and not user.whatsapp_verified:
        # Send verification code automatically
        try:
            await auth_service.send_verification_code(db, user.cpf)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "WhatsApp não verificado. Código enviado.",
                    "whatsapp": user.formatted_whatsapp,
                    "action": "verify_whatsapp"
                }
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "WhatsApp não verificado. Não foi possível enviar o código agora.",
                    "whatsapp": user.formatted_whatsapp,
                    "action": "verify_whatsapp"
                }
            )
    
    # Get account data for token
    account = None
    if user.account_id:
        result = await db.execute(
            select(Account).where(Account.id == user.account_id)
        )
        account = result.scalar_one_or_none()
    
    # Create access token
    access_token = auth_service.create_access_token(user, account)
    
    # Prepare user info
    enabled_modules = []
    if user.is_super_admin:
        enabled_modules = ["AvAdmin", "StockTech", "Lucrum"]
    elif user.enabled_modules is not None:
        enabled_modules = user.enabled_modules or []
    elif account:
        enabled_modules = account.enabled_modules or []

    client_type = None
    if user.client_type:
        client_type = user.client_type.value
    elif account and account.client_type:
        client_type = account.client_type.value
    
    user_info = UserInfo(
        id=str(user.id),
        full_name=user.full_name,
        cpf=user.cpf,
        whatsapp=user.whatsapp,
        role=user.role.value,
        account_id=str(user.account_id) if user.account_id else None,
        client_type=client_type,
        is_active=user.is_active,
        whatsapp_verified=user.whatsapp_verified,
        enabled_modules=enabled_modules
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expire_days * 24 * 60 * 60,  # Convert days to seconds
        user=user_info
    )


@router.post("/switch-company", response_model=LoginResponse)
async def switch_company(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Switch CPF admin session to company (CNPJ) context"""
    if current_user.role != UserRole.ADMIN or not current_user.account_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não permitido")

    result = await db.execute(
        select(Account).where(Account.id == current_user.account_id)
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")

    if account.status not in [AccountStatus.ACTIVE, AccountStatus.TRIAL]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta inativa")

    access_token = auth_service.create_access_token(
        current_user,
        account,
        cpf_override=account.document
    )

    enabled_modules = []
    if current_user.is_super_admin:
        enabled_modules = ["AvAdmin", "StockTech", "Lucrum"]
    elif current_user.enabled_modules is not None:
        enabled_modules = current_user.enabled_modules or []
    else:
        enabled_modules = account.enabled_modules or []

    client_type = None
    if current_user.client_type:
        client_type = current_user.client_type.value
    elif account.client_type:
        client_type = account.client_type.value
    user_info = UserInfo(
        id=str(current_user.id),
        full_name=current_user.full_name,
        cpf=account.document,
        whatsapp=current_user.whatsapp,
        role=current_user.role.value,
        account_id=str(account.id),
        client_type=client_type,
        is_active=current_user.is_active,
        whatsapp_verified=current_user.whatsapp_verified,
        enabled_modules=enabled_modules
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expire_days * 24 * 60 * 60,
        user=user_info
    )

@router.post("/register/account", response_model=MessageResponse)
async def register_account(
    request: RegisterAccountRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new company account"""
    
    # Create account and admin user
    account, admin_user = await auth_service.create_account_with_admin(
        db=db,
        company_name=request.company_name,
        cnpj=request.cnpj,
        responsible_name=request.responsible_name,
        whatsapp=request.whatsapp,
        password=request.password,
        plan_slug=request.plan_slug,
        admin_cpf=request.admin_cpf,
        address=request.address,
        address_number=request.address_number,
        address_neighborhood=request.address_neighborhood,
        complement=request.complement,
        city=request.city,
        state=request.state,
        zip_code=request.zip_code,
        client_type=request.client_type,
    )
    
    # Send verification code
    await auth_service.send_verification_code(db, admin_user.cpf)
    
    return MessageResponse(
        message=f"Conta criada! Código de verificação enviado para {admin_user.formatted_whatsapp}",
        success=True
    )

@router.post("/register/individual", response_model=MessageResponse)
async def register_individual(
    request: RegisterIndividualRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new individual user (CPF)"""

    new_user = await auth_service.create_individual_user(
        db=db,
        full_name=request.full_name,
        cpf=request.cpf,
        whatsapp=request.whatsapp,
        password=request.password,
        birth_date=request.birth_date,
        address_street=request.address_street,
        address_city=request.address_city,
        address_state=request.address_state,
        address_number=request.address_number,
        address_neighborhood=request.address_neighborhood,
        complement=request.complement,
        zip_code=request.zip_code,
        client_type=request.client_type,
    )

    await auth_service.send_verification_code(db, new_user.cpf)

    return MessageResponse(
        message=f"Conta criada! Código de verificação enviado para {new_user.formatted_whatsapp}",
        success=True
    )

@router.post("/register/user", response_model=MessageResponse)
async def register_user(
    request: RegisterUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register new user for existing account (admin only)"""
    
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar usuários"
        )
    
    # Check if account can create more users
    result = await db.execute(
        select(Account).where(Account.id == current_user.account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account or not account.can_create_user():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limite de usuários atingido para o plano atual"
        )
    
    # Check if CPF already exists
    result = await db.execute(
        select(User.id).where(User.cpf == request.cpf)
    )
    if result.scalar():
        raise HTTPException(status_code=400, detail="CPF já cadastrado")
    
    # Create user
    new_user = User(
        full_name=request.full_name,
        cpf=request.cpf,
        whatsapp=request.whatsapp,
        password_hash=security.hash_password(request.password),
        account_id=current_user.account_id,
        role=UserRole.USER,
        is_active=True,
        whatsapp_verified=False,
        client_type=account.client_type if account else None,
        enabled_modules=account.enabled_modules if account else [],
        login_count=0
    )
    
    db.add(new_user)
    
    # Update account user count
    account.increment_usage("users")
    
    await db.commit()
    
    # Send verification code
    await auth_service.send_verification_code(db, new_user.cpf)
    
    return MessageResponse(
        message=f"Usuário criado! Código enviado para {new_user.formatted_whatsapp}",
        success=True
    )

@router.post("/send-verification", response_model=VerificationResponse)
async def send_verification(
    request: SendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send WhatsApp verification code"""
    
    await auth_service.send_verification_code(db, request.cpf)
    
    return VerificationResponse(
        message="Código de verificação enviado via WhatsApp",
        expires_in=300,  # 5 minutes
        success=True
    )

@router.post("/verify-whatsapp", response_model=MessageResponse)
async def verify_whatsapp(
    request: VerifyWhatsAppRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify WhatsApp with code"""
    
    await auth_service.verify_whatsapp_code(db, request.cpf, request.code)
    
    return MessageResponse(
        message="WhatsApp verificado com sucesso!",
        success=True
    )

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset code"""
    
    whatsapp = await auth_service.send_password_reset_code(db, request.document)
    digits = "".join(char for char in whatsapp if char.isdigit())
    last4 = digits[-4:] if digits else ""

    return ForgotPasswordResponse(
        message="Código de recuperação enviado via WhatsApp",
        masked_whatsapp=last4,
        success=True
    )

@router.post("/reset-password", response_model=MessageResponse)  
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with verification code"""
    
    await auth_service.reset_password(db, request.document, request.code, request.new_password)
    
    return MessageResponse(
        message="Senha alterada com sucesso!",
        success=True
    )

@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user information"""
    
    # Get enabled modules and client type from user (fallback to account)
    enabled_modules = []
    client_type = None
    if current_user.is_super_admin:
        enabled_modules = ["AvAdmin", "StockTech", "Lucrum"]
    elif current_user.enabled_modules is not None:
        enabled_modules = current_user.enabled_modules or []

    if current_user.client_type:
        client_type = current_user.client_type.value

    if current_user.account_id and (client_type is None or current_user.enabled_modules is None):
        result = await db.execute(
            select(Account.enabled_modules, Account.client_type).where(Account.id == current_user.account_id)
        )
        account_row = result.first()
        if account_row:
            account_modules, account_client_type = account_row
            if current_user.enabled_modules is None:
                enabled_modules = account_modules or []
            if client_type is None:
                client_type = account_client_type.value if account_client_type else None
    
    return UserInfo(
        id=str(current_user.id),
        full_name=current_user.full_name,
        cpf=current_user.cpf,
        whatsapp=current_user.whatsapp,
        role=current_user.role.value,
        account_id=str(current_user.account_id) if current_user.account_id else None,
        client_type=client_type,
        is_active=current_user.is_active,
        whatsapp_verified=current_user.whatsapp_verified,
        enabled_modules=enabled_modules
    )

@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout user (client-side token removal)"""
    
    # In JWT, logout is handled client-side by removing the token
    # Could implement token blacklist here if needed
    
    return MessageResponse(
        message="Logout realizado com sucesso",
        success=True
    )

@router.get("/health")
async def auth_health_check():
    """Authentication service health check"""
    
    # Test WhatsApp service
    whatsapp_ok = await whatsapp_health_check()
    
    return {
        "status": "healthy",
        "service": "auth",
        "whatsapp_api": "ok" if whatsapp_ok else "unavailable",
        "jwt_algorithm": settings.jwt_algorithm,
        "token_expire_days": settings.jwt_expire_days
    }