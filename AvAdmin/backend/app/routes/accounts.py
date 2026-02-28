# ========================================
# AVADMIN - Accounts API Routes
# ========================================

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..routes.auth import get_current_user
from ..models.account import Account, AccountStatus, ClientType, DocumentType
from ..core.security import security
from ..models.user import User, UserRole

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


# ==========================================
# SCHEMAS
# ==========================================

class MigrateToCnpjPayload(BaseModel):
    """Migrate account from CPF to CNPJ payload"""
    cpf: str = Field(..., pattern=r"^\d{11}$", description="CPF atual da conta (11 dígitos)")
    new_cnpj: str = Field(..., pattern=r"^\d{14}$", description="Novo CNPJ (14 dígitos)")
    new_business_name: str = Field(..., min_length=2, description="Novo nome da empresa")


@router.get("", response_model=dict)
async def list_accounts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all accounts with pagination and filters
    Only super_admin and admin can access
    """
    # Check permissions
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = select(Account)

    # Apply filters
    if status:
        try:
            status_enum = AccountStatus(status)
            query = query.where(Account.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            (func.lower(Account.company_name).like(search_term)) |
            (Account.document.like(search_term))
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.order_by(Account.created_at.desc()).offset(skip).limit(limit)

    # Execute query
    result = await db.execute(query)
    accounts = result.scalars().all()

    # Format response
    accounts_data = []
    for account in accounts:
        # Get plan name if exists
        plan_name = None
        if account.plan_id:
            # You might want to join with plans table here
            pass

        accounts_data.append({
            "id": str(account.id),
            "company_name": account.company_name,
            "document": account.document,
            "document_type": account.document_type.value if account.document_type else None,
            "is_individual": account.is_individual,
            "owner_cpf": account.owner_cpf,
            "whatsapp": account.whatsapp,
            "status": account.status.value,
            "client_type": account.client_type.value,
            "plan_id": str(account.plan_id) if account.plan_id else None,
            "plan_name": plan_name,
            "enabled_modules": account.enabled_modules or [],
            "whatsapp_verified": account.whatsapp_verified,
            "created_at": account.created_at.isoformat() if account.created_at else None,
            "trial_ends_at": account.trial_ends_at,
        })

    return {
        "accounts": accounts_data,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{account_id}", response_model=dict)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get account details by ID"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Get user count
    user_count_result = await db.execute(
        select(func.count()).select_from(User).where(User.account_id == account_id)
    )
    user_count = user_count_result.scalar() or 0

    return {
        "id": str(account.id),
        "company_name": account.company_name,
        "document": account.document,
        "document_type": account.document_type.value if account.document_type else None,
        "is_individual": account.is_individual,
        "owner_cpf": account.owner_cpf,
        "previous_document": account.previous_document,
        "responsible_name": account.responsible_name,
        "whatsapp": account.whatsapp,
        "status": account.status.value,
        "client_type": account.client_type.value,
        "plan_id": str(account.plan_id) if account.plan_id else None,
        "enabled_modules": account.enabled_modules or [],
        "whatsapp_verified": account.whatsapp_verified,
        "address": account.address,
        "city": account.city,
        "state": account.state,
        "zip_code": account.zip_code,
        "created_at": account.created_at.isoformat() if account.created_at else None,
        "trial_ends_at": account.trial_ends_at,
        "user_count": user_count,
    }


@router.post("", response_model=dict)
async def create_account(
    account_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new account"""
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can create accounts")

    # Validate required fields
    required_fields = ["company_name", "cnpj", "whatsapp", "responsible_name"]
    for field in required_fields:
        if field not in account_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    # Normalize document (CNPJ ou CPF)
    doc = account_data.get("cnpj") or account_data.get("document")
    doc_type = account_data.get("document_type", "cnpj")
    
    if doc_type == "cnpj":
        try:
            doc = security.normalize_cnpj(doc)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        try:
            doc = security.normalize_cpf(doc)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Check if document already exists
    existing = await db.execute(
        select(Account).where(Account.document == doc)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Documento já registrado")

    # Normalize owner_cpf if provided
    owner_cpf = account_data.get("owner_cpf")
    if owner_cpf:
        owner_cpf = security.normalize_cpf(owner_cpf)

    # Create account
    new_account = Account(
        id=doc,
        document=doc,
        document_type=DocumentType(doc_type),
        is_individual=(doc_type == "cpf"),
        company_name=account_data["company_name"],
        owner_cpf=owner_cpf,
        whatsapp=account_data["whatsapp"],
        responsible_name=account_data["responsible_name"],
        status=AccountStatus(account_data.get("status", "trial")),
        client_type=ClientType(account_data.get("client_type", "lojista")),
        enabled_modules=account_data.get("enabled_modules", []),
        address=account_data.get("address"),
        city=account_data.get("city"),
        state=account_data.get("state"),
        zip_code=account_data.get("zip_code"),
    )

    db.add(new_account)
    await db.commit()
    await db.refresh(new_account)

    return {
        "id": str(new_account.id),
        "message": "Account created successfully",
        "account": {
            "id": str(new_account.id),
            "company_name": new_account.company_name,
            "document": new_account.document,
            "document_type": new_account.document_type.value,
            "status": new_account.status.value,
        }
    }


@router.put("/{account_id}", response_model=dict)
async def update_account(
    account_id: str,
    account_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing account"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Update fields
    if "company_name" in account_data:
        account.company_name = account_data["company_name"]
    if "owner_cpf" in account_data:
        owner_cpf = account_data["owner_cpf"]
        if owner_cpf:
            owner_cpf = security.normalize_cpf(owner_cpf)
        account.owner_cpf = owner_cpf
    if "whatsapp" in account_data:
        account.whatsapp = account_data["whatsapp"]
    if "status" in account_data:
        account.status = AccountStatus(account_data["status"])
    if "client_type" in account_data:
        account.client_type = ClientType(account_data["client_type"])
    if "enabled_modules" in account_data:
        account.enabled_modules = account_data["enabled_modules"]
    if "address" in account_data:
        account.address = account_data["address"]
    if "city" in account_data:
        account.city = account_data["city"]
    if "state" in account_data:
        account.state = account_data["state"]
    if "zip_code" in account_data:
        account.zip_code = account_data["zip_code"]

    await db.commit()
    await db.refresh(account)

    return {
        "message": "Account updated successfully",
        "account": {
            "id": str(account.id),
            "company_name": account.company_name,
            "status": account.status.value,
        }
    }


@router.delete("/{account_id}", response_model=dict)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an account (soft delete by setting status to cancelled)"""
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can delete accounts")

    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Soft delete
    account.status = AccountStatus.cancelled
    await db.commit()

    return {
        "message": "Account deleted successfully",
        "account_id": str(account_id)
    }


@router.post("/{account_id}/suspend", response_model=dict)
async def suspend_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Suspend an account"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.status = AccountStatus.suspended
    await db.commit()

    return {
        "message": "Account suspended successfully",
        "account_id": str(account_id),
        "status": "suspended"
    }


@router.post("/{account_id}/activate", response_model=dict)
async def activate_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a suspended account"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(Account).where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.status = AccountStatus.active
    await db.commit()

    return {
        "message": "Account activated successfully",
        "account_id": str(account_id),
        "status": "active"
    }


@router.post("/migrate-to-cnpj", response_model=dict)
async def migrate_account_to_cnpj(
    payload: MigrateToCnpjPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Migrate account from CPF to CNPJ - Single entity principle
    Only account owner can perform this migration
    """
    # Validate CNPJ format
    try:
        normalized_cnpj = security.normalize_cnpj(payload.new_cnpj)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Buscar account atual (CPF)
    account_result = await db.execute(
        select(Account).where(Account.id == payload.cpf)
    )
    account = account_result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account com CPF não encontrada")

    # 2. Verificar se o usuário atual é o dono da account
    if account.owner_cpf != current_user.cpf:
        raise HTTPException(status_code=403, detail="Apenas o dono da conta pode migrar para CNPJ")

    # 3. Verificar se já existe uma account com esse CNPJ
    existing_cnpj_result = await db.execute(
        select(Account).where(Account.id == normalized_cnpj)
    )
    if existing_cnpj_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Já existe uma account com este CNPJ")

    # 4. Migrar account (ATUALIZAR, não criar nova)
    old_id = account.id

    # Guardar documento anterior para histórico
    account.previous_document = account.id

    # Atualizar para CNPJ
    account.id = normalized_cnpj
    account.document = normalized_cnpj
    account.document_type = DocumentType.cnpj
    account.is_individual = False
    account.company_name = payload.new_business_name

    # 5. Atualizar todos os usuários vinculados a esta account
    await db.execute(
        update(User).where(User.account_id == old_id).values(account_id=normalized_cnpj)
    )

    await db.commit()

    return {
        "success": True,
        "message": "Account migrada de CPF para CNPJ com sucesso",
        "old_account_id": old_id,
        "new_account_id": normalized_cnpj,
        "previous_document": old_id,
        "migrated_at": account.updated_at.isoformat() if account.updated_at else None
    }

