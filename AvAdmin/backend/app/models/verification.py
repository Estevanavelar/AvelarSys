# ========================================
# AVADMIN - Verification Code Model
# ========================================

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import UUID

from .base import Base

class VerificationCodeType(str, enum.Enum):
    """Types of verification codes"""
    WHATSAPP_LOGIN = "whatsapp_login"
    PASSWORD_RESET = "password_reset"
    PHONE_VERIFICATION = "phone_verification"

class VerificationCode(Base):
    """
    Verification codes for WhatsApp and other verifications
    """
    __tablename__ = "verification_codes"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")

    # Foreign key to user
    user_id = Column(
        String(11),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Code details
    code = Column(String(6), nullable=False)  # 6-digit code
    type = Column(
        Enum(
            VerificationCodeType,
            name="verificationcodetype",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )

    # Status and attempts
    used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)

    # Expiration
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    def __repr__(self):
        return f"<VerificationCode {self.type} for user {self.user_id} ({'used' if self.used else 'active'})>"

    @property
    def is_expired(self) -> bool:
        """Check if code is expired"""
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def is_valid(self) -> bool:
        """Check if code is still valid"""
        return not self.used and not self.is_expired and self.attempts < self.max_attempts

    def increment_attempts(self) -> bool:
        """Increment attempts and return if still valid"""
        self.attempts += 1
        return self.attempts < self.max_attempts

    def mark_used(self):
        """Mark code as used"""
        self.used = True
