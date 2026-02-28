# ========================================
# AVADMIN - Users API Routes
# ========================================

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..routes.auth import get_current_user
from ..core.security import SecurityUtils
from ..models.user import User, UserRole
from ..models.account import Account, ClientType
from ..schemas.internal import UserInfo

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=dict)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[str] = None,
    account_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all users with pagination and filters
    Only super_admin and admin can access all users
    Managers can see users from their account
    """
    # Check permissions
    if current_user.role.value not in ["super_admin", "admin"]:
        if current_user.role == "manager" and current_user.account_id:
            account_id = current_user.account_id
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = select(User)

    # Apply filters
    if account_id:
        query = query.where(User.account_id == account_id)
    elif current_user.account_id and current_user.role.value != "super_admin":
        # Non-super_admin users can only see users from their account
        query = query.where(User.account_id == current_user.account_id)

    if role:
        try:
            role_enum = UserRole(role)
            query = query.where(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            (func.lower(User.full_name).like(search_term)) |
            (User.cpf.like(search_term)) |
            (User.whatsapp.like(search_term))
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)

    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()

    # Get account names
    account_ids = {user.account_id for user in users if user.account_id}
    accounts_map = {}
    if account_ids:
        accounts_result = await db.execute(
            select(Account).where(Account.id.in_(account_ids))
        )
        accounts = accounts_result.scalars().all()
        accounts_map = {str(acc.id): acc.company_name for acc in accounts}

    # Format response
    users_data = []
    for user in users:
        users_data.append({
            "id": str(user.id),
            "full_name": user.full_name,
            "cpf": user.cpf,
            "whatsapp": user.whatsapp,
            "role": user.role.value,
            "account_id": str(user.account_id) if user.account_id else None,
            "account_name": accounts_map.get(str(user.account_id)) if user.account_id else None,
            "is_active": user.is_active,
            "whatsapp_verified": user.whatsapp_verified,
            "client_type": user.client_type.value if user.client_type else None,
            "enabled_modules": user.enabled_modules or [],
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })

    return {
        "users": users_data,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user details by ID"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    if current_user.role.value not in ["super_admin", "admin"]:
        if user.account_id != current_user.account_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get account name
    account_name = None
    if user.account_id:
        account_result = await db.execute(
            select(Account).where(Account.id == user.account_id)
        )
        account = account_result.scalar_one_or_none()
        if account:
            account_name = account.company_name

    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "cpf": user.cpf,
        "whatsapp": user.whatsapp,
        "role": user.role.value,
        "account_id": str(user.account_id) if user.account_id else None,
        "account_name": account_name,
        "is_active": user.is_active,
        "whatsapp_verified": user.whatsapp_verified,
        "client_type": user.client_type.value if user.client_type else None,
        "enabled_modules": user.enabled_modules or [],
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "zip_code": user.zip_code,
        "address_number": user.address_number,
        "store_name": user.store_name,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "login_count": user.login_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("", response_model=dict)
async def create_user(
    user_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user"""
    # Check permissions
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Validate required fields
    required_fields = ["full_name", "cpf", "whatsapp", "password", "role"]
    for field in required_fields:
        if field not in user_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    # Normalize and validate CPF
    try:
        user_data["cpf"] = SecurityUtils.normalize_cpf(user_data["cpf"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check if CPF already exists
    existing = await db.execute(
        select(User).where(User.cpf == user_data["cpf"])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="CPF already registered")

    # Validate account_id if provided
    account_id = user_data.get("account_id")
    if account_id:
        try:
            account_id = SecurityUtils.normalize_cnpj(account_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        account_result = await db.execute(
            select(Account).where(Account.id == account_id)
        )
        if not account_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Account not found")

    # Hash password
    password_hash = SecurityUtils.hash_password(user_data["password"])

    # Resolve client type
    client_type_value = user_data.get("client_type")
    client_type_enum = None
    if client_type_value:
        try:
            client_type_enum = ClientType(client_type_value)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid client_type: {client_type_value}")

    # Resolve enabled modules
    enabled_modules = user_data.get("enabled_modules")
    if enabled_modules is not None and not isinstance(enabled_modules, list):
        raise HTTPException(status_code=400, detail="enabled_modules must be a list")
    if enabled_modules is None and account_id:
        account_result = await db.execute(
            select(Account).where(Account.id == account_id)
        )
        account = account_result.scalar_one_or_none()
        enabled_modules = account.enabled_modules if account else []

    # Create user
    new_user = User(
        id=user_data["cpf"],
        full_name=user_data["full_name"],
        cpf=user_data["cpf"],
        whatsapp=user_data["whatsapp"],
        password_hash=password_hash,
        role=UserRole(user_data["role"]),
        account_id=account_id if account_id else None,
        is_active=user_data.get("is_active", True),
        whatsapp_verified=user_data.get("whatsapp_verified", False),
        client_type=client_type_enum,
        enabled_modules=enabled_modules,
        zip_code=user_data.get("zip_code"),
        address_number=user_data.get("address_number"),
        store_name=user_data.get("store_name"),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "id": str(new_user.id),
        "message": "User created successfully",
        "user": {
            "id": str(new_user.id),
            "full_name": new_user.full_name,
            "cpf": new_user.cpf,
            "role": new_user.role.value,
        }
    }


@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    user_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing user"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    if current_user.role.value not in ["super_admin", "admin"]:
        if user.account_id != current_user.account_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Update fields
    if "full_name" in user_data:
        user.full_name = user_data["full_name"]
    if "whatsapp" in user_data:
        user.whatsapp = user_data["whatsapp"]
    if "role" in user_data:
        user.role = UserRole(user_data["role"])
    if "is_active" in user_data:
        user.is_active = user_data["is_active"]
    if "whatsapp_verified" in user_data:
        user.whatsapp_verified = user_data["whatsapp_verified"]
    if "password" in user_data:
        user.password_hash = SecurityUtils.hash_password(user_data["password"])
    if "zip_code" in user_data:
        user.zip_code = user_data["zip_code"]
    if "address_number" in user_data:
        user.address_number = user_data["address_number"]
    if "store_name" in user_data:
        user.store_name = user_data["store_name"]
    if "client_type" in user_data:
        if user_data["client_type"] is None:
            user.client_type = None
        else:
            try:
                user.client_type = ClientType(user_data["client_type"])
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid client_type: {user_data['client_type']}")
    if "enabled_modules" in user_data:
        if user_data["enabled_modules"] is not None and not isinstance(user_data["enabled_modules"], list):
            raise HTTPException(status_code=400, detail="enabled_modules must be a list")
        user.enabled_modules = user_data["enabled_modules"]

    await db.commit()
    await db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "role": user.role.value,
        }
    }


@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a user (soft delete by setting is_active to False)"""
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can delete users")

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Soft delete
    user.is_active = False
    await db.commit()

    return {
        "message": "User deleted successfully",
        "user_id": str(user_id)
    }


@router.post("/{user_id}/activate", response_model=dict)
async def activate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a user"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    await db.commit()

    return {
        "message": "User activated successfully",
        "user_id": str(user_id),
        "is_active": True
    }


@router.post("/{user_id}/deactivate", response_model=dict)
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a user"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    await db.commit()

    return {
        "message": "User deactivated successfully",
        "user_id": str(user_id),
        "is_active": False
    }

