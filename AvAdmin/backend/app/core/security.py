# ========================================
# AVADMIN - Security & JWT Utilities
# ========================================

import secrets
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt

from .config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityUtils:
    """Security utilities for authentication"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password with bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=settings.jwt_expire_days)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def generate_verification_code() -> str:
        """Generate secure 6-digit verification code"""
        return f"{secrets.randbelow(900000) + 100000:06d}"
    
    @staticmethod
    def normalize_cpf(cpf: str) -> str:
        """Normalize CPF: remove formatting, validate length"""
        clean_cpf = re.sub(r'\D', '', cpf)
        
        if len(clean_cpf) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        
        return clean_cpf
    
    @staticmethod
    def normalize_cnpj(cnpj: str) -> str:
        """Normalize CNPJ: remove formatting, validate length"""
        clean_cnpj = re.sub(r'\D', '', cnpj)
        
        if len(clean_cnpj) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")
        
        return clean_cnpj
    
    @staticmethod
    def normalize_whatsapp(whatsapp: str) -> str:
        """Normalize WhatsApp: +5511999999999 format"""
        clean_phone = re.sub(r'\D', '', whatsapp)
        
        # Add Brazil prefix if missing
        if not clean_phone.startswith('55'):
            clean_phone = '55' + clean_phone
        
        # Validate length (55 + area code + number)
        if len(clean_phone) not in [12, 13]:  # 55 + 2 digits area + 8/9 digits number
            raise ValueError("WhatsApp inválido")
        
        return '+' + clean_phone
    
    @staticmethod
    def validate_cpf(cpf: str) -> bool:
        """Validate CPF algorithm (Brazilian document)"""
        try:
            clean_cpf = SecurityUtils.normalize_cpf(cpf)
        except ValueError:
            return False
        
        # Special case for super admin
        if clean_cpf == "00000000000":
            return True
        
        # CPF validation algorithm
        if clean_cpf == clean_cpf[0] * 11:  # All same digits
            return False
        
        # Calculate first verification digit
        sum_digits = 0
        for i in range(9):
            sum_digits += int(clean_cpf[i]) * (10 - i)
        
        remainder = sum_digits % 11
        first_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(clean_cpf[9]) != first_digit:
            return False
        
        # Calculate second verification digit
        sum_digits = 0
        for i in range(10):
            sum_digits += int(clean_cpf[i]) * (11 - i)
        
        remainder = sum_digits % 11
        second_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(clean_cpf[10]) != second_digit:
            return False
        
        return True
    
    @staticmethod
    def validate_cnpj(cnpj: str) -> bool:
        """Validate CNPJ algorithm (Brazilian company document)"""
        try:
            clean_cnpj = SecurityUtils.normalize_cnpj(cnpj)
        except ValueError:
            return False
        
        # CNPJ validation algorithm
        if clean_cnpj == clean_cnpj[0] * 14:  # All same digits
            return False
        
        # Calculate first verification digit
        sequence = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        sum_digits = sum(int(clean_cnpj[i]) * sequence[i] for i in range(12))
        
        remainder = sum_digits % 11
        first_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(clean_cnpj[12]) != first_digit:
            return False
        
        # Calculate second verification digit
        sequence = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        sum_digits = sum(int(clean_cnpj[i]) * sequence[i] for i in range(13))
        
        remainder = sum_digits % 11
        second_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(clean_cnpj[13]) != second_digit:
            return False
        
        return True
    
    @staticmethod
    def normalize_document(document: str) -> tuple[str, str]:
        """Normalize and determine document type (CPF or CNPJ)"""
        clean_doc = re.sub(r'\D', '', document)
        
        if len(clean_doc) == 11:
            if SecurityUtils.validate_cpf(clean_doc):
                return clean_doc, "CPF"
            else:
                raise ValueError("CPF inválido")
        elif len(clean_doc) == 14:
            if SecurityUtils.validate_cnpj(clean_doc):
                return clean_doc, "CNPJ"
            else:
                raise ValueError("CNPJ inválido")
        else:
            raise ValueError("Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)")

# Global security instance
security = SecurityUtils()