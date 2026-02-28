# ========================================
# AVADMIN - Billing Models (SaaS Payments)
# ========================================

import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base

class TransactionStatus(str, enum.Enum):
    """Billing transaction status"""
    PENDING = "pending"              # Awaiting payment
    PAID = "paid"                    # Successfully paid
    FAILED = "failed"                # Payment failed
    CANCELLED = "cancelled"          # Cancelled by user
    REFUNDED = "refunded"           # Refunded
    EXPIRED = "expired"             # Payment link expired

class PaymentMethod(str, enum.Enum):
    """Payment methods available"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    BOLETO = "boleto"
    BANK_TRANSFER = "bank_transfer"

class BillingTransaction(Base):
    """
    Billing Transaction model - SaaS Payments
    Tracks all payment transactions for plan subscriptions
    """
    __tablename__ = "billing_transactions"
    
    # References
    account_id = Column(
        String(14),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    # Transaction Details
    amount = Column(Numeric(10, 2), nullable=False)  # Amount charged
    currency = Column(String(3), default="BRL", nullable=False)  # Currency code
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    
    # External Payment Gateway
    mercadopago_id = Column(String(100), nullable=True, index=True)  # MercadoPago transaction ID
    mercadopago_status = Column(String(50), nullable=True)           # MercadoPago status
    payment_gateway = Column(String(50), default="mercadopago", nullable=False)
    
    # Payment Details
    pix_qr_code = Column(Text, nullable=True)                       # PIX QR Code
    boleto_url = Column(String(500), nullable=True)                 # Boleto URL
    payment_link = Column(String(500), nullable=True)               # Payment page URL
    
    # Billing Period
    billing_period_start = Column(DateTime(timezone=True), nullable=True)
    billing_period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    paid_at = Column(DateTime(timezone=True), nullable=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)      # For PIX/Boleto
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional Information
    description = Column(Text, nullable=True)                       # Transaction description
    invoice_number = Column(String(50), nullable=True, index=True)  # Invoice number
    
    # Metadata from payment gateway
    gateway_metadata = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="Metadata from payment gateway (MercadoPago response, etc.)"
    )
    
    # Customer information at transaction time
    customer_name = Column(String(100), nullable=True)
    customer_phone = Column(String(15), nullable=True)
    customer_document = Column(String(14), nullable=True)           # CPF/CNPJ
    
    # Discounts and fees
    discount_amount = Column(Numeric(10, 2), default=0, nullable=False)
    discount_coupon = Column(String(50), nullable=True)
    gateway_fee = Column(Numeric(10, 2), default=0, nullable=False)
    net_amount = Column(Numeric(10, 2), nullable=True)              # Amount after fees
    
    # Internal flags
    is_trial_conversion = Column(Boolean, default=False, nullable=False)  # Trial to paid
    is_upgrade = Column(Boolean, default=False, nullable=False)           # Plan upgrade
    is_renewal = Column(Boolean, default=False, nullable=False)           # Subscription renewal
    
    # Relationships (will be defined after all models are loaded)
    # account = relationship("Account", back_populates="billing_transactions")
    # plan = relationship("Plan", back_populates="billing_transactions")
    
    def __repr__(self):
        return f"<BillingTransaction {self.id} - R$ {self.amount} ({self.status})>"
    
    @property
    def amount_formatted(self) -> str:
        """Return formatted amount: R$ 39,90"""
        return f"R$ {self.amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    @property
    def is_paid(self) -> bool:
        """Check if transaction is paid"""
        return self.status == TransactionStatus.PAID
    
    @property
    def is_pending(self) -> bool:
        """Check if transaction is pending"""
        return self.status == TransactionStatus.PENDING
    
    @property
    def is_expired(self) -> bool:
        """Check if payment has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def days_until_expiry(self) -> Optional[int]:
        """Get days until payment expires"""
        if not self.expires_at:
            return None
        
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)
    
    @property
    def billing_period_months(self) -> Optional[int]:
        """Get billing period in months"""
        if not self.billing_period_start or not self.billing_period_end:
            return None
        
        delta = self.billing_period_end - self.billing_period_start
        return delta.days // 30  # Approximate months
    
    def mark_as_paid(self, paid_at: Optional[datetime] = None):
        """Mark transaction as paid"""
        self.status = TransactionStatus.PAID
        self.paid_at = paid_at or datetime.utcnow()
    
    def mark_as_failed(self, reason: Optional[str] = None):
        """Mark transaction as failed"""
        self.status = TransactionStatus.FAILED
        if reason:
            metadata = self.gateway_metadata or {}
            metadata["failure_reason"] = reason
            self.gateway_metadata = metadata
    
    def mark_as_cancelled(self, cancelled_at: Optional[datetime] = None):
        """Mark transaction as cancelled"""
        self.status = TransactionStatus.CANCELLED
        self.cancelled_at = cancelled_at or datetime.utcnow()
    
    def calculate_net_amount(self):
        """Calculate net amount after discounts and fees"""
        gross = self.amount - self.discount_amount
        self.net_amount = gross - self.gateway_fee
    
    def apply_discount(self, discount_amount: Decimal, coupon_code: Optional[str] = None):
        """Apply discount to transaction"""
        self.discount_amount = discount_amount
        if coupon_code:
            self.discount_coupon = coupon_code
        self.calculate_net_amount()
    
    def get_payment_summary(self) -> dict:
        """Get payment summary for receipts/invoices"""
        return {
            "transaction_id": str(self.id),
            "invoice_number": self.invoice_number,
            "amount": float(self.amount),
            "amount_formatted": self.amount_formatted,
            "discount": float(self.discount_amount),
            "net_amount": float(self.net_amount or self.amount),
            "currency": self.currency,
            "status": self.status.value,
            "payment_method": self.payment_method.value if self.payment_method else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "billing_period": {
                "start": self.billing_period_start.isoformat() if self.billing_period_start else None,
                "end": self.billing_period_end.isoformat() if self.billing_period_end else None,
            },
            "customer": {
                "name": self.customer_name,
                "phone": self.customer_phone,
                "document": self.customer_document
            }
        }