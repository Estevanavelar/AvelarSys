# ========================================
# AVADMIN - Simple Authentication (No Cache)
# ========================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from datetime import datetime

from ..core.config import settings
from ..core.security import security

router = APIRouter(prefix="/api/auth-simple", tags=["Simple Auth"])

class SimpleLoginRequest(BaseModel):
    cpf: str
    password: str

class SimpleLoginResponse(BaseModel):
    success: bool
    token: str
    user_name: str
    role: str

# ========================================
# REGISTRO PÚBLICO (StockTech)
# ========================================

class AddressData(BaseModel):
    cep: str
    street: str
    number: str
    complement: Optional[str] = None
    neighborhood: str
    city: str
    state: str

class RegisterRequest(BaseModel):
    name: str
    phone: str
    cpf: str
    password: str
    account_type: str = "BUYER"  # BUYER, SELLER, BOTH
    company_name: Optional[str] = None
    trade_name: Optional[str] = None
    address: Optional[AddressData] = None

class RegisterResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None

@router.post("/login", response_model=SimpleLoginResponse)
async def simple_login(request: SimpleLoginRequest):
    """Login simples sem cache (teste)"""
    
    # Create fresh engine without cache
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_size=1,
        max_overflow=0,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        }
    )
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            # Definir schema correto
            await db.execute(text("SET search_path TO avelar_admin, public"))
            
            # Normalize CPF
            try:
                clean_cpf = security.normalize_cpf(request.cpf)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

            # Find user
            result = await db.execute(
                text("SELECT id, full_name, password_hash, role FROM users WHERE cpf = :cpf AND is_active = true"),
                {"cpf": clean_cpf}
            )
            
            user_data = result.fetchone()
            
            if not user_data:
                raise HTTPException(status_code=401, detail="CPF não encontrado")
            
            user_id, full_name, password_hash, role = user_data
            
            # Verify password
            if not security.verify_password(request.password, password_hash):
                raise HTTPException(status_code=401, detail="Senha incorreta")
            
            # Create token
            token_data = {
                "user_id": str(user_id),
                "cpf": clean_cpf,
                "role": role
            }
            
            token = security.create_access_token(token_data)
            
            return SimpleLoginResponse(
                success=True,
                token=token,
                user_name=full_name,
                role=role
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")
    
    finally:
        await engine.dispose()

@router.get("/test-cpf/{cpf}")
async def test_cpf_validation(cpf: str):
    """Testar validação de CPF"""
    
    try:
        clean_cpf = security.normalize_cpf(cpf)
        is_valid = security.validate_cpf(clean_cpf)
        
        return {
            "cpf_original": cpf,
            "cpf_clean": clean_cpf,
            "is_valid": is_valid,
            "message": "CPF válido" if is_valid else "CPF inválido"
        }
    except Exception as e:
        return {
            "cpf_original": cpf,
            "cpf_clean": None,
            "is_valid": False,
            "error": str(e)
        }


@router.post("/register", response_model=RegisterResponse)
async def register_user(request: RegisterRequest):
    """Registro público de usuário para StockTech"""
    
    # Create fresh engine without cache
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_size=1,
        max_overflow=0,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        }
    )
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            # Definir schema correto
            await db.execute(text("SET search_path TO avelar_admin, public"))
            
            # Verificar se CPF já existe
            result = await db.execute(
                text("SELECT id FROM users WHERE cpf = :cpf"),
                {"cpf": security.normalize_cpf(request.cpf)}
            )
            existing = result.fetchone()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="CPF já cadastrado no sistema"
                )
            
            # Hash da senha
            password_hash = security.hash_password(request.password)
            
            # Usar CPF como ID
            user_id = security.normalize_cpf(request.cpf)
            
            # Determinar role baseado no tipo de conta
            role = "user"  # Padrão para StockTech (minúsculas como o enum PostgreSQL)
            
            # Criar usuário
            await db.execute(
                text("""
                    INSERT INTO users (
                        id, full_name, cpf, whatsapp, password_hash,
                        role, is_active, whatsapp_verified, login_count,
                        created_at, updated_at
                    ) VALUES (
                        :id, :name, :cpf, :phone, :password_hash,
                        :role, true, false, 0,
                        :now, :now
                    )
                """),
                {
                    "id": user_id,
                    "name": request.name,
                    "cpf": user_id,
                    "phone": request.phone,
                    "password_hash": password_hash,
                    "role": role,
                    "now": datetime.utcnow()
                }
            )
            
            await db.commit()
            
            # TODO: Enviar código de verificação via WhatsApp
            # await send_verification_code(request.phone)
            
            return RegisterResponse(
                success=True,
                message=f"Conta criada com sucesso! Faça login para acessar o sistema.",
                user_id=user_id
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar conta: {str(e)}"
        )
    
    finally:
        await engine.dispose()


@router.get("/check-cpf/{cpf}")
async def check_cpf_available(cpf: str):
    """Verificar se CPF está disponível para cadastro"""
    
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_size=1,
        max_overflow=0,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        }
    )
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            await db.execute(text("SET search_path TO avelar_admin, public"))
            result = await db.execute(
                text("SELECT id FROM users WHERE cpf = :cpf"),
                {"cpf": cpf}
            )
            existing = result.fetchone()
            
            return {
                "cpf": cpf,
                "available": existing is None,
                "message": "CPF disponível" if existing is None else "CPF já cadastrado"
            }
    
    except Exception as e:
        return {
            "cpf": cpf,
            "available": False,
            "error": str(e)
        }
    
    finally:
        await engine.dispose()

