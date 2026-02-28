# ========================================
# AVADMIN - Authentication Service
# ========================================

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from ..models import User, Account, Plan, UserRole, AccountStatus, ClientType, DocumentType, VerificationCode, VerificationCodeType
from ..core.security import security
from ..services.whatsapp import send_verification_code, send_welcome_message

class AuthService:
    """Authentication service for login, registration, and WhatsApp verification"""
    
    async def authenticate_user(self, db: AsyncSession, document: str, password: str) -> Optional[User]:
        """Authenticate user with CPF/CNPJ + password"""
        
        try:
            clean_doc, doc_type = security.normalize_document(document)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Find user by CPF (individuals) or by company CNPJ (companies)
        if doc_type == "CPF":
            result = await db.execute(
                select(User).where(
                    User.cpf == clean_doc,
                    User.is_active == True
                )
            )
            user = result.scalar_one_or_none()
            if not user:
                return None
            # Verify password
            if not security.verify_password(password, user.password_hash):
                return None
        else:  # CNPJ
            # Find company first, then admin users
            result = await db.execute(
                select(Account).where(
                    Account.document == clean_doc,
                    Account.status.in_([AccountStatus.ACTIVE, AccountStatus.TRIAL])
                )
            )
            account = result.scalar_one_or_none()
            
            if not account:
                return None
            
            # Find admin users of this company and match password
            result = await db.execute(
                select(User).where(
                    User.account_id == account.id,
                    User.role == UserRole.ADMIN,
                    User.is_active == True
                ).order_by(User.created_at.asc())
            )
            admins = result.scalars().all()
            user = next(
                (candidate for candidate in admins if security.verify_password(password, candidate.password_hash)),
                None
            )
            if not user:
                return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        try:
            login_count = int(user.login_count) if user.login_count is not None else 0
        except (TypeError, ValueError):
            login_count = 0
        user.login_count = login_count + 1
        await db.commit()
        
        return user
    
    async def create_account_with_admin(
        self,
        db: AsyncSession,
        company_name: str,
        cnpj: str,
        responsible_name: str,
        whatsapp: str,
        password: str,
        plan_slug: Optional[str] = None,
        admin_cpf: Optional[str] = None,
        address: Optional[str] = None,
        address_number: Optional[str] = None,
        address_neighborhood: Optional[str] = None,
        complement: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        zip_code: Optional[str] = None,
        client_type: Optional[str] = None,
    ) -> Tuple[Account, User]:
        """Create new company account with admin user"""
        
        # Normalize and validate documents
        try:
            cnpj = security.normalize_cnpj(cnpj)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not admin_cpf:
            raise HTTPException(status_code=400, detail="CPF do responsável é obrigatório")

        try:
            admin_cpf = security.normalize_cpf(admin_cpf)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Check if CNPJ already exists
        result = await db.execute(
            select(Account.id).where(Account.document == cnpj)
        )
        if result.scalar():
            raise HTTPException(status_code=400, detail="Documento já cadastrado")
        
        # Check if WhatsApp already exists
        result = await db.execute(
            select(Account.id).where(Account.whatsapp == whatsapp)
        )
        if result.scalar():
            raise HTTPException(status_code=400, detail="WhatsApp já cadastrado")
        
        # Get plan by slug (or default)
        selected_plan_slug = plan_slug or "lojista"
        result = await db.execute(
            select(Plan).where(Plan.slug == selected_plan_slug)
        )
        default_plan = result.scalar_one_or_none()
        
        if not default_plan:
            raise HTTPException(status_code=400, detail="Plano informado não encontrado")
        
        # Resolve client type
        client_type_value = (client_type or ClientType.lojista.value).lower()
        try:
            client_type_enum = ClientType(client_type_value)
        except ValueError:
            client_type_enum = ClientType.lojista

        # Create account
        account = Account(
            id=cnpj,
            company_name=company_name,
            cnpj=cnpj,
            responsible_name=responsible_name,
            whatsapp=whatsapp,
            plan_id=default_plan.id,
            status=AccountStatus.TRIAL,  # Start with trial
            client_type=client_type_enum,
            enabled_modules=["StockTech"],  # Enable StockTech by default
            whatsapp_verified=False,  # Will be verified via code
            address=address,
            complement=complement,
            city=city,
            state=state,
            zip_code=zip_code,
            max_users=default_plan.max_users,
            max_products=default_plan.max_products,
            max_transactions=default_plan.max_transactions,
            current_users="1",  # Will have admin user
            current_products="0",
            current_transactions_month="0"
        )
        
        db.add(account)
        await db.flush()  # Get account.id
        
        # Ensure CPF is unique for admin user
        admin_cpf_to_use = admin_cpf
        result = await db.execute(
            select(User.id).where(User.cpf == admin_cpf_to_use)
        )
        if result.scalar():
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

        # Create admin user for the company
        admin_user = User(
            id=admin_cpf_to_use,
            full_name=responsible_name,
            cpf=admin_cpf_to_use,
            whatsapp=whatsapp,
            password_hash=security.hash_password(password),
            account_id=account.id,
            role=UserRole.ADMIN,
            is_active=True,
            whatsapp_verified=False,  # Will be verified
            client_type=client_type_enum,
            enabled_modules=account.enabled_modules or [],
            login_count=0,
            address_street=address,
            address_city=city,
            address_state=state,
            address_number=address_number,
            address_neighborhood=address_neighborhood,
            complement=complement,
            zip_code=zip_code,
        )
        
        db.add(admin_user)
        await db.commit()
        
        return account, admin_user

    async def create_individual_user(
        self,
        db: AsyncSession,
        full_name: str,
        cpf: str,
        whatsapp: str,
        password: str,
        birth_date: Optional[datetime] = None,
        address_street: Optional[str] = None,
        address_city: Optional[str] = None,
        address_state: Optional[str] = None,
        address_number: Optional[str] = None,
        address_neighborhood: Optional[str] = None,
        complement: Optional[str] = None,
        zip_code: Optional[str] = None,
        client_type: Optional[str] = None,
    ) -> User:
        try:
            cpf = security.normalize_cpf(cpf)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        result = await db.execute(
            select(User.id).where(User.cpf == cpf)
        )
        if result.scalar():
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

        client_type_value = (client_type or ClientType.cliente.value).lower()
        try:
            client_type_enum = ClientType(client_type_value)
        except ValueError:
            client_type_enum = ClientType.cliente

        new_user = User(
            id=cpf,
            full_name=full_name,
            cpf=cpf,
            whatsapp=whatsapp,
            password_hash=security.hash_password(password),
            account_id=None,
            role=UserRole.USER,
            is_active=True,
            whatsapp_verified=False,
            client_type=client_type_enum,
            enabled_modules=[],
            login_count=0,
            birth_date=birth_date,
            address_street=address_street,
            address_city=address_city,
            address_state=address_state,
            address_number=address_number,
            address_neighborhood=address_neighborhood,
            complement=complement,
            zip_code=zip_code,
        )

        db.add(new_user)
        await db.commit()
        return new_user
    
    async def send_verification_code(self, db: AsyncSession, cpf: str) -> bool:
        """Send WhatsApp verification code to user"""
        
        # Find user
        result = await db.execute(
            select(User).where(User.cpf == cpf, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Invalidate previous pending codes for this user
        result = await db.execute(
            select(VerificationCode).where(
                VerificationCode.user_id == user.id,
                VerificationCode.type == VerificationCodeType.PHONE_VERIFICATION,
                VerificationCode.used == False
            )
        )
        for pending in result.scalars().all():
            pending.used = True

        # Generate code and expiry
        code = security.generate_verification_code()
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        # Save code in database
        verification = VerificationCode(
            user_id=user.id,
            code=code,
            type=VerificationCodeType.PHONE_VERIFICATION,
            expires_at=expires_at
        )
        db.add(verification)
        await db.commit()
        
        # Send via WhatsApp (automatic)
        success = await send_verification_code(user.whatsapp, code)
        
        if not success and settings.is_production:
            # Mark code as used if sending failed in production
            verification.used = True
            await db.commit()
            raise HTTPException(status_code=500, detail="Falha ao enviar código via WhatsApp")
        
        return True
    
    async def verify_whatsapp_code(self, db: AsyncSession, cpf: str, code: str) -> bool:
        """Verify WhatsApp code and mark as verified"""
        
        # Find user
        result = await db.execute(
            select(User).where(User.cpf == cpf, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Fetch latest active verification code
        result = await db.execute(
            select(VerificationCode).where(
                VerificationCode.user_id == user.id,
                VerificationCode.type == VerificationCodeType.PHONE_VERIFICATION,
                VerificationCode.used == False
            ).order_by(VerificationCode.created_at.desc()).limit(1)
        )
        verification = result.scalar_one_or_none()

        if not verification:
            raise HTTPException(status_code=400, detail="Nenhum código pendente")

        if verification.is_expired:
            verification.used = True
            await db.commit()
            raise HTTPException(status_code=400, detail="Código expirado")

        if verification.code != code:
            still_valid = verification.increment_attempts()
            if not still_valid:
                verification.used = True
            await db.commit()
            raise HTTPException(status_code=400, detail="Código inválido")

        # Valid code
        verification.mark_used()
        user.whatsapp_verified = True
        await db.commit()
        
        # Send welcome message if this was first verification
        if user.whatsapp_verified:
            asyncio.create_task(
                send_welcome_message(user.whatsapp, user.full_name)
            )
        
        return True
    
    async def send_password_reset_code(self, db: AsyncSession, document: str) -> str:
        """Send password reset code via WhatsApp and return destination"""
        
        try:
            clean_doc, doc_type = security.normalize_document(document)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Find user
        if doc_type == "CPF":
            result = await db.execute(
                select(User).where(User.cpf == clean_doc, User.is_active == True)
            )
            user = result.scalar_one_or_none()
        else:  # CNPJ
            result = await db.execute(
                select(User, Account).join(Account).where(
                    Account.document == clean_doc,
                    Account.status.in_([AccountStatus.ACTIVE, AccountStatus.TRIAL]),
                    User.role == UserRole.ADMIN
                )
            )
            row = result.first()
            user = row[0] if row else None
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Invalidate previous pending reset codes for this user
        result = await db.execute(
            select(VerificationCode).where(
                VerificationCode.user_id == user.id,
                VerificationCode.type == VerificationCodeType.PASSWORD_RESET,
                VerificationCode.used == False
            )
        )
        for pending in result.scalars().all():
            pending.used = True

        # Generate reset code
        code = security.generate_verification_code()
        expires_at = datetime.utcnow() + timedelta(minutes=10)  # 10 minutes for reset

        # Save code
        verification = VerificationCode(
            user_id=user.id,
            code=code,
            type=VerificationCodeType.PASSWORD_RESET,
            expires_at=expires_at
        )
        db.add(verification)
        await db.commit()
        
        # Send via WhatsApp (automatic)
        success = await send_verification_code(user.whatsapp, code)  # Same function for reset codes
        
        if not success and settings.is_production:
            verification.used = True
            await db.commit()
            raise HTTPException(status_code=500, detail="Falha ao enviar código de recuperação")
        
        return user.whatsapp
    
    async def reset_password(self, db: AsyncSession, document: str, code: str, new_password: str) -> bool:
        """Reset password with verification code"""
        
        try:
            clean_doc, doc_type = security.normalize_document(document)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Find user (same logic as password reset code)
        if doc_type == "CPF":
            result = await db.execute(
                select(User).where(User.cpf == clean_doc, User.is_active == True)
            )
            user = result.scalar_one_or_none()
        else:  # CNPJ
            result = await db.execute(
                select(User, Account).join(Account).where(
                    Account.document == clean_doc,
                    Account.status.in_([AccountStatus.ACTIVE, AccountStatus.TRIAL]),
                    User.role == UserRole.ADMIN
                )
            )
            row = result.first()
            user = row[0] if row else None
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Fetch latest active reset code
        result = await db.execute(
            select(VerificationCode).where(
                VerificationCode.user_id == user.id,
                VerificationCode.type == VerificationCodeType.PASSWORD_RESET,
                VerificationCode.used == False
            ).order_by(VerificationCode.created_at.desc()).limit(1)
        )
        verification = result.scalar_one_or_none()

        if not verification:
            raise HTTPException(status_code=400, detail="Nenhum código de recuperação pendente")

        if verification.is_expired:
            verification.used = True
            await db.commit()
            raise HTTPException(status_code=400, detail="Código expirado")

        if verification.code != code:
            still_valid = verification.increment_attempts()
            if not still_valid:
                verification.used = True
            await db.commit()
            raise HTTPException(status_code=400, detail="Código inválido")

        # Update password and mark code used
        verification.mark_used()
        user.password_hash = security.hash_password(new_password)
        await db.commit()
        
        return True
    
    def create_access_token(
        self,
        user: User,
        account: Optional[Account] = None,
        cpf_override: Optional[str] = None,
    ) -> str:
        """Create JWT access token for user"""
        
        # Get enabled modules from user (fallback to account)
        enabled_modules = []
        if user.is_super_admin:
            enabled_modules = ["AvAdmin", "StockTech", "Lucrum"]  # Super admin has access to everything
        elif user.enabled_modules is not None:
            enabled_modules = user.enabled_modules or []
        elif account:
            enabled_modules = account.enabled_modules or []
        
        # Create token payload
        token_data = {
            "sub": str(user.id),  # Subject (user ID)
            "user_id": str(user.id),
            "cpf": cpf_override or user.cpf,
            "role": user.role.value,
            "account_id": str(account.id) if account else None,
            "enabled_modules": enabled_modules,
            "whatsapp_verified": user.whatsapp_verified,
            "iat": datetime.utcnow(),  # Issued at
        }
        
        return security.create_access_token(token_data)

# Global auth service instance
auth_service = AuthService()