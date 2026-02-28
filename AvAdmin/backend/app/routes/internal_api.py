"""
========================================
AVELAR SYSTEM - AvAdmin Internal API
========================================
APIs internas para comunicação com outros módulos (StockTech, Lucrum, etc.)
Essas rotas NÃO devem ser expostas publicamente
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime
import secrets
import logging

from app.core.database import get_db
from app.core.security import security
from app.core.security import SecurityUtils
from app.models import User, Account, UserRole, AccountStatus, ClientType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/internal", tags=["internal"])


# ========================================
# SCHEMAS
# ========================================

class TokenValidationRequest(BaseModel):
    """Request para validação de token"""
    token: str


class UserData(BaseModel):
    """Dados do usuário para resposta"""
    id: str
    cpf: str
    full_name: str
    whatsapp: str
    role: str
    account_id: Optional[str] = None
    is_active: bool
    whatsapp_verified: bool
    client_type: Optional[str] = None
    enabled_modules: Optional[List[str]] = None
    zip_code: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_number: Optional[str] = None
    address_neighborhood: Optional[str] = None
    complement: Optional[str] = None
    reference_point: Optional[str] = None
    store_name: Optional[str] = None
    devices: Optional[List[Dict[str, Any]]] = None


class AccountData(BaseModel):
    """Dados da conta para resposta"""
    id: str
    document: str
    document_type: str
    is_individual: bool
    company_name: str
    business_name: Optional[str] = None
    owner_cpf: Optional[str] = None
    whatsapp: str
    plan_id: Optional[str] = None
    status: str
    enabled_modules: List[str]
    previous_document: Optional[str] = None
    address: Optional[str] = None
    complement: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class TokenValidationResponse(BaseModel):
    """Resposta da validação de token"""
    valid: bool
    user: Optional[UserData] = None
    account: Optional[AccountData] = None
    error: Optional[str] = None


class ModuleAccessRequest(BaseModel):
    """Request para verificar acesso a módulo"""
    account_id: str
    user_id: Optional[str] = None
    module: str


class ModuleAccessResponse(BaseModel):
    """Resposta da verificação de acesso"""
    hasAccess: bool
    module: str
    reason: Optional[str] = None


class IncrementUsageRequest(BaseModel):
    """Request para incrementar uso"""
    account_id: str
    usage_type: str
    amount: int = 1


class CreateFinalCustomerRequest(BaseModel):
    """Request para criar/obter cliente final no AvAdmin"""
    full_name: str
    cpf: str
    whatsapp: str


class CustomerData(BaseModel):
    """Dados mínimos de cliente final para consumo interno"""
    id: str
    cpf: str
    full_name: str
    whatsapp: str
    role: str
    account_id: Optional[str] = None
    is_active: bool
    whatsapp_verified: bool
    client_type: Optional[str] = None
    devices: Optional[List[Dict[str, Any]]] = None


class CustomerDeviceRequest(BaseModel):
    brand: str
    model: str
    device_label: Optional[str] = None


# ========================================
# ROUTES
# ========================================

def _normalize_devices(raw_devices: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_devices, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for item in raw_devices:
        if not isinstance(item, dict):
            continue

        brand = str(item.get("brand") or "").strip().upper()
        model = str(item.get("model") or "").strip().upper()
        if not brand or not model:
            continue

        device_label = str(item.get("device_label") or "").strip().upper()
        if not device_label:
            device_label = f"{brand} {model}".strip()

        normalized.append({
            "id": str(item.get("id") or f"{brand}-{model}"),
            "brand": brand,
            "model": model,
            "device_label": device_label,
            "is_active": bool(item.get("is_active", True)),
            "created_at": item.get("created_at"),
            "updated_at": item.get("updated_at"),
        })

    return normalized


def _upsert_device(devices: List[Dict[str, Any]], brand: str, model: str, device_label: str) -> List[Dict[str, Any]]:
    now = datetime.utcnow().isoformat()
    target_brand = brand.strip().upper()
    target_model = model.strip().upper()
    target_label = device_label.strip().upper() or f"{target_brand} {target_model}".strip()

    for device in devices:
        if device.get("brand") == target_brand and device.get("model") == target_model:
            device["device_label"] = target_label
            device["is_active"] = True
            device["updated_at"] = now
            if not device.get("created_at"):
                device["created_at"] = now
            return devices

    devices.append({
        "id": secrets.token_hex(8),
        "brand": target_brand,
        "model": target_model,
        "device_label": target_label,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })
    return devices

@router.post("/validate-token", response_model=TokenValidationResponse)
async def validate_token(
    request: TokenValidationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Valida um token JWT e retorna dados do usuário e conta
    
    **Uso:** Outros módulos chamam esta rota para validar tokens JWT
    """
    try:
        # Decodificar token
        payload = security.verify_token(request.token)
        
        if not payload:
            return TokenValidationResponse(
                valid=False,
                error="Token inválido ou expirado"
            )
        
        user_id = payload.get("user_id")
        if not user_id:
            return TokenValidationResponse(
                valid=False,
                error="Token não contém user_id"
            )
        
        # Buscar usuário
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return TokenValidationResponse(
                valid=False,
                error="Usuário não encontrado"
            )
        
        # Buscar conta
        account = None
        if user.account_id:
            result = await db.execute(
                select(Account).where(Account.id == user.account_id)
            )
            account = result.scalar_one_or_none()
        
        if not account:
            # Super admin não possui account_id - liberar com conta virtual
            if user.role == UserRole.SUPER_ADMIN:
                enabled_modules = payload.get("enabled_modules") or ["AvAdmin", "StockTech", "Shop", "Naldo"]
                super_admin_account_id = "00000000-0000-0000-0000-000000000000"
                return TokenValidationResponse(
                    valid=True,
                    user=UserData(
                        id=str(user.id),
                        cpf=user.cpf,
                        full_name=user.full_name,
                        whatsapp=user.whatsapp,
                        role=user.role.value,
                        account_id=str(user.account_id) if user.account_id else super_admin_account_id,
                        is_active=user.is_active,
                        whatsapp_verified=user.whatsapp_verified,
                        client_type=user.client_type.value if user.client_type else None,
                        enabled_modules=enabled_modules,
                        zip_code=user.zip_code,
                        address_street=user.address_street,
                        address_city=user.address_city,
                        address_state=user.address_state,
                        address_number=user.address_number,
                        address_neighborhood=user.address_neighborhood,
                        complement=user.complement,
                        reference_point=user.reference_point,
                        store_name=user.store_name,
                        devices=_normalize_devices(user.devices),
                    ),
                    account=AccountData(
                        id=super_admin_account_id,
                        document="",
                        document_type="cnpj",
                        is_individual=False,
                        company_name="Avelar Company",
                        business_name="Avelar Company",
                        owner_cpf=user.cpf,
                        whatsapp=user.whatsapp,
                        plan_id="super_admin",
                        status=AccountStatus.ACTIVE.value,
                        enabled_modules=enabled_modules,
                        previous_document=None,
                        address=None,
                        complement=None,
                        city=None,
                        state=None,
                        zip_code=None
                    )
                )

            return TokenValidationResponse(
                valid=False,
                error="Conta não encontrada"
            )
        
        # Retornar dados
        return TokenValidationResponse(
            valid=True,
            user=UserData(
                id=str(user.id),
                cpf=user.cpf,
                full_name=user.full_name,
                whatsapp=user.whatsapp,
                role=user.role.value,
                account_id=str(user.account_id),
                is_active=user.is_active,
                whatsapp_verified=user.whatsapp_verified,
                client_type=user.client_type.value if user.client_type else None,
                enabled_modules=user.enabled_modules if user.enabled_modules is not None else (account.enabled_modules or []),
                zip_code=user.zip_code,
                address_street=user.address_street,
                address_city=user.address_city,
                address_state=user.address_state,
                address_number=user.address_number,
                address_neighborhood=user.address_neighborhood,
                complement=user.complement,
                reference_point=user.reference_point,
                store_name=user.store_name,
                devices=_normalize_devices(user.devices),
            ),
            account=AccountData(
                id=str(account.id),
                document=account.document,
                document_type=account.document_type.value if account.document_type else "cnpj",
                is_individual=account.is_individual or False,
                company_name=account.company_name,
                business_name=account.company_name,
                owner_cpf=account.owner_cpf,
                whatsapp=account.whatsapp,
                plan_id=str(account.plan_id) if account.plan_id else None,
                status=account.status.value,
                enabled_modules=account.enabled_modules or [],
                previous_document=account.previous_document,
                address=account.address,
                complement=account.complement,
                city=account.city,
                state=account.state,
                zip_code=account.zip_code
            )
        )
        
    except Exception as e:
        logger.error(f"Erro ao validar token: {e}")
        return TokenValidationResponse(
            valid=False,
            error="Erro ao validar token"
        )


@router.get("/user/{user_id}", response_model=UserData)
async def get_user_by_id(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Busca dados de um usuário por ID
    
    **Uso:** Outros módulos podem buscar informações de usuários
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return UserData(
        id=str(user.id),
        cpf=user.cpf,
        full_name=user.full_name,
        whatsapp=user.whatsapp,
        role=user.role.value,
        account_id=str(user.account_id) if user.account_id else None,
        is_active=user.is_active,
        whatsapp_verified=user.whatsapp_verified,
        client_type=user.client_type.value if user.client_type else None,
        zip_code=user.zip_code,
        address_street=user.address_street,
        address_city=user.address_city,
        address_state=user.address_state,
        address_number=user.address_number,
        address_neighborhood=user.address_neighborhood,
        complement=user.complement,
        reference_point=user.reference_point,
        store_name=user.store_name,
        devices=_normalize_devices(user.devices),
    )


@router.post("/customer", response_model=CustomerData)
async def create_or_get_final_customer(
    request: CreateFinalCustomerRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Cria (ou retorna) um cliente final no AvAdmin.

    Regras:
    - client_type = cliente
    - role = user
    - account_id = null (cliente final não possui empresa própria)
    """
    try:
        cpf = SecurityUtils.normalize_cpf(request.cpf)
        whatsapp = SecurityUtils.normalize_whatsapp(request.whatsapp)
        full_name = (request.full_name or "").strip()

        if len(full_name) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome completo deve ter pelo menos 3 caracteres"
            )

        result = await db.execute(
            select(User).where(User.cpf == cpf)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing_client_type = existing.client_type.value if existing.client_type else None
            if existing_client_type not in ["cliente", "cliente_final"] or existing.account_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="CPF já cadastrado para um usuário que não é cliente final"
                )

            return CustomerData(
                id=str(existing.id),
                cpf=existing.cpf,
                full_name=existing.full_name,
                whatsapp=existing.whatsapp,
                role=existing.role.value,
                account_id=str(existing.account_id) if existing.account_id else None,
                is_active=existing.is_active,
                whatsapp_verified=existing.whatsapp_verified,
                client_type=existing_client_type,
                devices=_normalize_devices(existing.devices),
            )

        random_password = SecurityUtils.hash_password(secrets.token_urlsafe(24))
        new_customer = User(
            id=cpf,
            cpf=cpf,
            full_name=full_name,
            whatsapp=whatsapp,
            password_hash=random_password,
            role=UserRole.user,
            account_id=None,
            is_active=True,
            whatsapp_verified=True,
            client_type=ClientType.cliente,
            enabled_modules=[],
        )

        db.add(new_customer)
        await db.commit()
        await db.refresh(new_customer)

        return CustomerData(
            id=str(new_customer.id),
            cpf=new_customer.cpf,
            full_name=new_customer.full_name,
            whatsapp=new_customer.whatsapp,
            role=new_customer.role.value,
            account_id=None,
            is_active=new_customer.is_active,
            whatsapp_verified=new_customer.whatsapp_verified,
            client_type=new_customer.client_type.value if new_customer.client_type else None,
            devices=_normalize_devices(new_customer.devices),
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao criar cliente final interno: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao criar cliente final"
        )


@router.get("/customer/{cpf}/devices", response_model=List[Dict[str, Any]])
async def get_customer_devices(
    cpf: str,
    db: AsyncSession = Depends(get_db)
):
    clean_cpf = SecurityUtils.normalize_cpf(cpf)
    result = await db.execute(select(User).where(User.cpf == clean_cpf))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )

    return _normalize_devices(user.devices)


@router.post("/customer/{cpf}/devices", response_model=List[Dict[str, Any]])
async def upsert_customer_device(
    cpf: str,
    request: CustomerDeviceRequest,
    db: AsyncSession = Depends(get_db)
):
    clean_cpf = SecurityUtils.normalize_cpf(cpf)
    result = await db.execute(select(User).where(User.cpf == clean_cpf))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )

    current_devices = _normalize_devices(user.devices)
    merged_devices = _upsert_device(
        current_devices,
        request.brand,
        request.model,
        request.device_label or "",
    )

    user.devices = merged_devices
    await db.commit()
    await db.refresh(user)

    return _normalize_devices(user.devices)


@router.get("/account/{account_id}", response_model=AccountData)
async def get_account_by_id(
    account_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Busca dados de uma conta por ID
    
    **Uso:** Outros módulos podem buscar informações de contas
    """
    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    return AccountData(
        id=str(account.id),
        document=account.document,
        document_type=account.document_type.value if account.document_type else "cnpj",
        is_individual=account.is_individual or False,
        company_name=account.company_name,
        business_name=account.company_name,
        owner_cpf=account.owner_cpf,
        whatsapp=account.whatsapp,
        plan_id=str(account.plan_id) if account.plan_id else None,
        status=account.status.value,
        enabled_modules=account.enabled_modules or [],
        previous_document=account.previous_document,
        address=account.address,
        complement=account.complement,
        city=account.city,
        state=account.state,
        zip_code=account.zip_code
    )


@router.post("/check-module-access", response_model=ModuleAccessResponse)
async def check_module_access(
    request: ModuleAccessRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica se uma conta tem acesso a um módulo específico
    
    **Uso:** Módulos verificam se a conta tem permissão para usar suas funcionalidades
    """
    result = await db.execute(
        select(Account).where(Account.id == request.account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        # Conta virtual do super admin
        if request.account_id == "00000000-0000-0000-0000-000000000000":
            return ModuleAccessResponse(
                hasAccess=True,
                module=request.module
            )

        return ModuleAccessResponse(
            hasAccess=False,
            module=request.module,
            reason="Conta não encontrada"
        )
    
    # Verificar status da conta
    if account.status not in [AccountStatus.ACTIVE, AccountStatus.TRIAL]:
        return ModuleAccessResponse(
            hasAccess=False,
            module=request.module,
            reason=f"Conta {account.status.value}"
        )
    
    # Verificar se módulo está habilitado
    if request.user_id:
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return ModuleAccessResponse(
                hasAccess=False,
                module=request.module,
                reason="Usuário não encontrado"
            )
        if user.role == UserRole.SUPER_ADMIN:
            return ModuleAccessResponse(
                hasAccess=True,
                module=request.module
            )
        enabled_modules = user.enabled_modules if user.enabled_modules is not None else (account.enabled_modules or [])
        if not enabled_modules or request.module not in enabled_modules:
            return ModuleAccessResponse(
                hasAccess=False,
                module=request.module,
                reason="Módulo não habilitado para este usuário"
            )
    else:
        if not account.enabled_modules or request.module not in account.enabled_modules:
            return ModuleAccessResponse(
                hasAccess=False,
                module=request.module,
                reason="Módulo não habilitado para esta conta"
            )
    
    return ModuleAccessResponse(
        hasAccess=True,
        module=request.module
    )


@router.post("/increment-usage")
async def increment_usage(
    request: IncrementUsageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Incrementa contador de uso de um recurso
    
    **Uso:** Módulos reportam uso de recursos para tracking e billing
    """
    # TODO: Implementar tracking de uso real
    # Por enquanto, apenas logga
    logger.info(
        f"Usage increment: account={request.account_id}, "
        f"type={request.usage_type}, amount={request.amount}"
    )
    
    return {"status": "ok", "message": "Usage tracked"}
