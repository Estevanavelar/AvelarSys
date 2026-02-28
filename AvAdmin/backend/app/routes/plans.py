# ========================================
# AVADMIN - Plans API Routes
# ========================================
# Rotas para gerenciamento de planos SaaS

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..routes.auth import get_current_user
from ..models.user import User, UserRole
from ..models.plan import Plan, BillingCycle, PlanType, PlanCategory
from ..models.account import Account, AccountStatus, DocumentType, ClientType

router = APIRouter(prefix="/api/plans", tags=["plans"])


# ==========================================
# SCHEMAS
# ==========================================

class PlanCreate(BaseModel):
    """Create plan payload"""
    name: str = Field(..., min_length=2, max_length=50)
    slug: str = Field(..., min_length=2, max_length=50)
    description: str = Field("", max_length=500)
    price: float = Field(..., ge=0)
    billing_cycle: str = Field("monthly")
    plan_type: str = Field("business")
    max_users: int = Field(1, ge=1)
    max_products: int = Field(100, ge=1)
    max_transactions: int = Field(500, ge=1)
    max_storage_gb: int = Field(1, ge=1)
    features: dict = {}
    is_active: bool = True
    is_popular: bool = False
    trial_days: int = Field(14, ge=0)
    display_order: int = Field(0, ge=0)
    color: str = Field("#3B82F6")


class PlanUpdate(BaseModel):
    """Update plan payload"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    plan_type: Optional[str] = None
    max_users: Optional[int] = None
    max_products: Optional[int] = None
    max_transactions: Optional[int] = None
    max_storage_gb: Optional[int] = None
    features: Optional[dict] = None
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None
    trial_days: Optional[int] = None
    display_order: Optional[int] = None
    color: Optional[str] = None


class SubscribePayload(BaseModel):
    """Subscribe to plan payload - Auto-detection based on plan category"""
    cpf: str = Field(..., pattern=r"^\d{11}$", description="CPF do usuário (11 dígitos)")
    plan_id: str = Field(..., description="UUID do plano")
    document: Optional[str] = Field(None, description="CPF ou CNPJ para account")
    document_type: str = Field("cpf", description="Tipo de documento: cpf ou cnpj")
    business_name: Optional[str] = Field(None, description="Nome da empresa (obrigatório para lojista)")


def plan_to_dict(plan: Plan, subscribers: int = 0) -> dict:
    """Convert Plan model to dict"""
    return {
        "id": str(plan.id),
        "name": plan.name,
        "slug": plan.slug,
        "description": plan.description,
        "price_monthly": float(plan.price) if plan.billing_cycle == BillingCycle.MONTHLY else float(plan.price) / 12,
        "price_yearly": float(plan.price) * 12 if plan.billing_cycle == BillingCycle.MONTHLY else float(plan.price),
        "price": float(plan.price),
        "billing_cycle": plan.billing_cycle.value if plan.billing_cycle else "monthly",
        "plan_type": plan.plan_type.value if plan.plan_type else "business",
        "max_users": int(plan.max_users),
        "max_products": int(plan.max_products),
        "max_transactions": int(plan.max_transactions),
        "max_storage_gb": int(plan.max_storage_gb),
        "features": list(plan.features.keys()) if isinstance(plan.features, dict) else plan.features or [],
        "modules": plan.features.get("modules", []) if isinstance(plan.features, dict) else [],
        "is_active": plan.is_active,
        "is_popular": plan.is_popular,
        "is_hidden": plan.is_hidden,
        "trial_days": int(plan.trial_days),
        "display_order": int(plan.display_order),
        "color": plan.color,
        "subscribers": subscribers,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None
    }


# ==========================================
# ROUTES
# ==========================================

@router.get("", response_model=dict)
async def list_plans(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all plans from database
    """
    # Build query
    query = select(Plan)
    
    if active_only:
        query = query.where(Plan.is_active == True)
    
    query = query.order_by(Plan.display_order.asc(), Plan.price.asc())
    
    result = await db.execute(query)
    plans = result.scalars().all()
    
    # Get subscriber counts for each plan
    plans_data = []
    total_subscribers = 0
    total_mrr = 0.0
    
    for plan in plans:
        # Count subscribers
        count_query = select(func.count()).select_from(Account).where(Account.plan_id == plan.id)
        count_result = await db.execute(count_query)
        subscribers = count_result.scalar() or 0
        
        total_subscribers += subscribers
        
        # Calculate MRR
        if plan.billing_cycle == BillingCycle.MONTHLY:
            total_mrr += float(plan.price) * subscribers
        elif plan.billing_cycle == BillingCycle.YEARLY:
            total_mrr += (float(plan.price) / 12) * subscribers
        
        plans_data.append(plan_to_dict(plan, subscribers))
    
    return {
        "plans": plans_data,
        "total": len(plans_data),
        "stats": {
            "total_subscribers": total_subscribers,
            "total_mrr": round(total_mrr, 2),
            "total_arr": round(total_mrr * 12, 2),
            "active_plans": len([p for p in plans if p.is_active])
        }
    }


@router.get("/{plan_id}", response_model=dict)
async def get_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get plan details by ID"""
    try:
        plan_uuid = UUID(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID format")
    
    result = await db.execute(select(Plan).where(Plan.id == plan_uuid))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get subscriber count
    count_query = select(func.count()).select_from(Account).where(Account.plan_id == plan.id)
    count_result = await db.execute(count_query)
    subscribers = count_result.scalar() or 0
    
    return {"plan": plan_to_dict(plan, subscribers)}


@router.post("", response_model=dict)
async def create_plan(
    plan_data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new plan"""
    if current_user.role.value not in ["super_admin"]:
        raise HTTPException(status_code=403, detail="Only super_admin can create plans")
    
    # Check if slug already exists
    existing = await db.execute(select(Plan).where(Plan.slug == plan_data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Plan with this slug already exists")
    
    # Create plan
    try:
        billing_cycle = BillingCycle(plan_data.billing_cycle)
    except ValueError:
        billing_cycle = BillingCycle.MONTHLY
    
    try:
        plan_type = PlanType(plan_data.plan_type)
    except ValueError:
        plan_type = PlanType.BUSINESS
    
    new_plan = Plan(
        name=plan_data.name,
        slug=plan_data.slug,
        description=plan_data.description,
        price=Decimal(str(plan_data.price)),
        billing_cycle=billing_cycle,
        plan_type=plan_type,
        max_users=str(plan_data.max_users),
        max_products=str(plan_data.max_products),
        max_transactions=str(plan_data.max_transactions),
        max_storage_gb=str(plan_data.max_storage_gb),
        features=plan_data.features,
        is_active=plan_data.is_active,
        is_popular=plan_data.is_popular,
        trial_days=str(plan_data.trial_days),
        display_order=str(plan_data.display_order),
        color=plan_data.color
    )
    
    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)
    
    return {
        "message": "Plan created successfully",
        "plan": plan_to_dict(new_plan)
    }


@router.put("/{plan_id}", response_model=dict)
async def update_plan(
    plan_id: str,
    plan_data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing plan"""
    if current_user.role.value not in ["super_admin"]:
        raise HTTPException(status_code=403, detail="Only super_admin can update plans")
    
    try:
        plan_uuid = UUID(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID format")
    
    result = await db.execute(select(Plan).where(Plan.id == plan_uuid))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update fields
    update_data = plan_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            if key == "price":
                setattr(plan, key, Decimal(str(value)))
            elif key == "billing_cycle":
                try:
                    setattr(plan, key, BillingCycle(value))
                except ValueError:
                    pass
            elif key == "plan_type":
                try:
                    setattr(plan, key, PlanType(value))
                except ValueError:
                    pass
            elif key in ["max_users", "max_products", "max_transactions", "max_storage_gb", "trial_days", "display_order"]:
                setattr(plan, key, str(value))
            else:
                setattr(plan, key, value)
    
    await db.commit()
    await db.refresh(plan)
    
    # Get subscriber count
    count_query = select(func.count()).select_from(Account).where(Account.plan_id == plan.id)
    count_result = await db.execute(count_query)
    subscribers = count_result.scalar() or 0
    
    return {
        "message": "Plan updated successfully",
        "plan": plan_to_dict(plan, subscribers)
    }


@router.delete("/{plan_id}", response_model=dict)
async def delete_plan(
    plan_id: str,
    hard_delete: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a plan (soft delete by default)"""
    if current_user.role.value not in ["super_admin"]:
        raise HTTPException(status_code=403, detail="Only super_admin can delete plans")
    
    try:
        plan_uuid = UUID(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID format")
    
    result = await db.execute(select(Plan).where(Plan.id == plan_uuid))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check if plan has subscribers
    count_query = select(func.count()).select_from(Account).where(Account.plan_id == plan.id)
    count_result = await db.execute(count_query)
    subscribers = count_result.scalar() or 0
    
    if subscribers > 0 and hard_delete:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot hard delete plan with {subscribers} active subscribers"
        )
    
    if hard_delete:
        await db.delete(plan)
        await db.commit()
        return {"message": "Plan permanently deleted", "plan_id": plan_id}
    else:
        # Soft delete
        plan.is_active = False
        plan.is_hidden = True
        await db.commit()
        return {"message": "Plan deactivated successfully", "plan_id": plan_id}


@router.post("/{plan_id}/toggle-popular", response_model=dict)
async def toggle_plan_popular(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle the 'popular' badge on a plan"""
    if current_user.role.value not in ["super_admin"]:
        raise HTTPException(status_code=403, detail="Only super_admin can modify plans")
    
    try:
        plan_uuid = UUID(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID format")
    
    result = await db.execute(select(Plan).where(Plan.id == plan_uuid))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Remove popular from all other plans
    await db.execute(
        update(Plan).where(Plan.id != plan_uuid).values(is_popular=False)
    )
    
    # Toggle this plan
    plan.is_popular = not plan.is_popular
    await db.commit()
    
    return {
        "message": f"Plan {'marked as popular' if plan.is_popular else 'unmarked as popular'}",
        "is_popular": plan.is_popular
    }


# ==========================================
# SUBSCRIPTION ROUTES (Public)
# ==========================================

async def create_or_update_account(
    db: AsyncSession,
    account_id: str,
    document_type: str,
    owner_cpf: str,
    business_name: str = None
) -> Account:
    """Create or update account based on document type"""
    # Check if account already exists
    existing = await db.execute(select(Account).where(Account.id == account_id))
    account = existing.scalar_one_or_none()

    if account:
        # Update existing account
        account.document = account_id
        account.document_type = DocumentType(document_type)
        account.owner_cpf = owner_cpf
        if business_name:
            account.company_name = business_name
        account.is_individual = document_type == "cpf"
        return account
    else:
        # Create new account
        doc_type_enum = DocumentType(document_type)

        new_account = Account(
            id=account_id,
            document=account_id,
            document_type=doc_type_enum,
            company_name=business_name or f"Empresa - {account_id}",
            owner_cpf=owner_cpf,
            is_individual=document_type == "cpf",
            status=AccountStatus.trial,
            enabled_modules=["inventory"]  # Basic modules
        )

        db.add(new_account)
        return new_account


@router.post("/subscribe", response_model=dict)
async def subscribe_to_plan(
    payload: SubscribePayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Subscribe to plan - Auto-detection based on plan category
    PUBLIC endpoint - No authentication required
    """
    # 1. Buscar e validar plano
    try:
        plan_uuid = UUID(payload.plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID format")

    plan_result = await db.execute(select(Plan).where(Plan.id == plan_uuid))
    plan = plan_result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Plano não está ativo")

    # 2. Buscar ou criar usuário
    user_result = await db.execute(select(User).where(User.cpf == payload.cpf))
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado. Faça o cadastro primeiro.")

    # 3. Auto-detecção baseada na categoria do plano
    category = plan.category

    if category in [PlanCategory.LOJISTA, PlanCategory.DISTRIBUIDOR]:
        # Criar account para lojistas/distribuidores
        if not payload.business_name:
            raise HTTPException(status_code=400, detail="Nome da empresa é obrigatório para lojistas")

        account_id = payload.document or payload.cpf

        # Validar document_type
        if payload.document_type not in ["cpf", "cnpj"]:
            raise HTTPException(status_code=400, detail="Tipo de documento deve ser 'cpf' ou 'cnpj'")

        account = await create_or_update_account(
            db, account_id, payload.document_type, payload.cpf, payload.business_name
        )

        # Atualizar user
        user.client_type = ClientType(category.value)
        user.account_id = account.id
        user.role = UserRole.admin if category == PlanCategory.LOJISTA else UserRole.user

        # Vincular plano à account
        account.plan_id = plan.id

    elif category == PlanCategory.CLIENTE_FINAL:
        # Cliente final - NÃO cria account
        user.client_type = ClientType.cliente
        user.account_id = None
        user.role = UserRole.user
    else:
        raise HTTPException(status_code=400, detail="Categoria de plano inválida")

    # 4. Criar transação de cobrança (se necessário)
    # TODO: Implementar criação de BillingTransaction

    await db.commit()

    return {
        "success": True,
        "message": "Inscrição realizada com sucesso",
        "client_type": user.client_type.value,
        "has_account": user.account_id is not None,
        "account_id": user.account_id
    }


# ==========================================
# PUBLIC ROUTES (No Auth Required)
# ==========================================

@router.get("/public/pricing", response_model=dict)
async def get_public_pricing(
    db: AsyncSession = Depends(get_db)
):
    """
    Get public pricing page data (no auth required)
    """
    query = select(Plan).where(
        Plan.is_active == True,
        Plan.is_hidden == False
    ).order_by(Plan.display_order.asc(), Plan.price.asc())
    
    result = await db.execute(query)
    plans = result.scalars().all()
    
    return {
        "plans": [
            {
                "id": str(plan.id),
                "name": plan.name,
                "slug": plan.slug,
                "description": plan.description,
                "price_monthly": float(plan.price) if plan.billing_cycle == BillingCycle.MONTHLY else float(plan.price) / 12,
                "price_yearly": float(plan.price) * 12 if plan.billing_cycle == BillingCycle.MONTHLY else float(plan.price),
                "price": float(plan.price),
                "billing_cycle": plan.billing_cycle.value if plan.billing_cycle else "monthly",
                "features": list(plan.features.keys()) if isinstance(plan.features, dict) else plan.features or [],
                "modules": plan.features.get("modules", []) if isinstance(plan.features, dict) else [],
                "is_popular": plan.is_popular,
                "trial_days": int(plan.trial_days),
                "color": plan.color,
                "plan_type": plan.plan_type.value if plan.plan_type else "business",
                "max_users": int(plan.max_users),
                "max_products": int(plan.max_products)
            }
            for plan in plans
        ]
    }
