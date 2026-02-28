# ========================================
# AVADMIN - Billing API Routes
# ========================================
# Rotas para gerenciamento de faturamento e transações

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..routes.auth import get_current_user
from ..models.user import User
from ..models.account import Account
from ..models.billing import BillingTransaction, TransactionStatus, PaymentMethod
from ..models.plan import Plan

router = APIRouter(prefix="/api/billing", tags=["billing"])


# ==========================================
# SCHEMAS
# ==========================================

class InvoiceCreate(BaseModel):
    """Create invoice payload"""
    account_id: str
    plan_id: Optional[str] = None
    amount: float = Field(..., gt=0)
    description: str = ""
    due_date: Optional[str] = None
    billing_period_start: Optional[str] = None
    billing_period_end: Optional[str] = None


class PaymentCreate(BaseModel):
    """Create payment payload"""
    method: str = "pix"  # pix, credit_card, boleto
    amount: Optional[float] = None


class InvoiceUpdate(BaseModel):
    """Update invoice payload"""
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


def transaction_to_dict(txn: BillingTransaction, account_name: str = "", plan_name: str = "") -> dict:
    """Convert BillingTransaction model to dict"""
    return {
        "id": str(txn.id),
        "invoice_number": txn.invoice_number,
        "account_id": str(txn.account_id) if txn.account_id else None,
        "account_name": account_name,
        "plan_id": str(txn.plan_id) if txn.plan_id else None,
        "plan_name": plan_name,
        "amount": float(txn.amount),
        "amount_formatted": f"R$ {float(txn.amount):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
        "currency": txn.currency,
        "status": txn.status.value if txn.status else "pending",
        "payment_method": txn.payment_method.value if txn.payment_method else None,
        "description": txn.description,
        "due_date": txn.expires_at.strftime("%Y-%m-%d") if txn.expires_at else None,
        "paid_at": txn.paid_at.isoformat() if txn.paid_at else None,
        "billing_period_start": txn.billing_period_start.isoformat() if txn.billing_period_start else None,
        "billing_period_end": txn.billing_period_end.isoformat() if txn.billing_period_end else None,
        "pix_qr_code": txn.pix_qr_code,
        "boleto_url": txn.boleto_url,
        "payment_link": txn.payment_link,
        "discount_amount": float(txn.discount_amount) if txn.discount_amount else 0,
        "discount_coupon": txn.discount_coupon,
        "net_amount": float(txn.net_amount) if txn.net_amount else float(txn.amount),
        "is_trial_conversion": txn.is_trial_conversion,
        "is_upgrade": txn.is_upgrade,
        "is_renewal": txn.is_renewal,
        "created_at": txn.created_at.isoformat() if txn.created_at else None,
        "updated_at": txn.updated_at.isoformat() if txn.updated_at else None
    }


# ==========================================
# INVOICE ROUTES
# ==========================================

@router.get("/invoices", response_model=dict)
async def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status: pending, paid, failed, cancelled, refunded, expired"),
    account_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all invoices (billing transactions) with filters
    """
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Build query
    query = select(BillingTransaction)
    
    if status:
        try:
            status_enum = TransactionStatus(status)
            query = query.where(BillingTransaction.status == status_enum)
        except ValueError:
            pass
    
    if account_id:
        query = query.where(BillingTransaction.account_id == account_id)
    
    query = query.order_by(BillingTransaction.created_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    # Build response with account and plan names
    invoices_data = []
    for txn in transactions:
        account_name = ""
        plan_name = ""
        
        if txn.account_id:
            acc_result = await db.execute(select(Account.company_name).where(Account.id == txn.account_id))
            acc_name = acc_result.scalar_one_or_none()
            if acc_name:
                account_name = acc_name
        
        if txn.plan_id:
            plan_result = await db.execute(select(Plan.name).where(Plan.id == txn.plan_id))
            pl_name = plan_result.scalar_one_or_none()
            if pl_name:
                plan_name = pl_name
        
        invoices_data.append(transaction_to_dict(txn, account_name, plan_name))
    
    # Calculate stats
    all_txns_query = select(BillingTransaction)
    all_result = await db.execute(all_txns_query)
    all_txns = all_result.scalars().all()
    
    total_pending = sum(float(t.amount) for t in all_txns if t.status == TransactionStatus.PENDING)
    total_paid = sum(float(t.amount) for t in all_txns if t.status == TransactionStatus.PAID)
    total_failed = sum(float(t.amount) for t in all_txns if t.status == TransactionStatus.FAILED)
    
    return {
        "invoices": invoices_data,
        "total": total,
        "stats": {
            "total_pending": round(total_pending, 2),
            "total_paid": round(total_paid, 2),
            "total_failed": round(total_failed, 2),
            "pending_count": len([t for t in all_txns if t.status == TransactionStatus.PENDING]),
            "paid_count": len([t for t in all_txns if t.status == TransactionStatus.PAID]),
            "failed_count": len([t for t in all_txns if t.status == TransactionStatus.FAILED])
        }
    }


@router.get("/invoices/{invoice_id}", response_model=dict)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice details by ID"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        invoice_uuid = UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    result = await db.execute(select(BillingTransaction).where(BillingTransaction.id == invoice_uuid))
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    account_name = ""
    plan_name = ""
    
    if txn.account_id:
        acc_result = await db.execute(select(Account.company_name).where(Account.id == txn.account_id))
        account_name = acc_result.scalar_one_or_none() or ""
    
    if txn.plan_id:
        plan_result = await db.execute(select(Plan.name).where(Plan.id == txn.plan_id))
        plan_name = plan_result.scalar_one_or_none() or ""
    
    return {"invoice": transaction_to_dict(txn, account_name, plan_name)}


@router.post("/invoices", response_model=dict)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create invoices")
    
    account_id = invoice_data.account_id
    
    # Verify account exists
    acc_result = await db.execute(select(Account).where(Account.id == account_id))
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Parse plan ID if provided
    plan_uuid = None
    if invoice_data.plan_id:
        try:
            plan_uuid = UUID(invoice_data.plan_id)
        except ValueError:
            pass
    
    # Generate invoice number
    count_result = await db.execute(select(func.count()).select_from(BillingTransaction))
    count = count_result.scalar() or 0
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m')}-{count + 1:04d}"
    
    # Parse dates
    expires_at = None
    if invoice_data.due_date:
        try:
            expires_at = datetime.fromisoformat(invoice_data.due_date.replace("Z", "+00:00"))
        except ValueError:
            expires_at = datetime.utcnow() + timedelta(days=15)
    else:
        expires_at = datetime.utcnow() + timedelta(days=15)
    
    billing_start = None
    billing_end = None
    if invoice_data.billing_period_start:
        try:
            billing_start = datetime.fromisoformat(invoice_data.billing_period_start.replace("Z", "+00:00"))
        except ValueError:
            pass
    if invoice_data.billing_period_end:
        try:
            billing_end = datetime.fromisoformat(invoice_data.billing_period_end.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    new_txn = BillingTransaction(
        account_id=account_id,
        plan_id=plan_uuid,
        amount=Decimal(str(invoice_data.amount)),
        currency="BRL",
        status=TransactionStatus.PENDING,
        description=invoice_data.description,
        invoice_number=invoice_number,
        expires_at=expires_at,
        billing_period_start=billing_start,
        billing_period_end=billing_end,
        customer_name=account.company_name,
        customer_document=account.document
    )
    
    db.add(new_txn)
    await db.commit()
    await db.refresh(new_txn)
    
    return {
        "message": "Invoice created successfully",
        "invoice": transaction_to_dict(new_txn, account.company_name, "")
    }


@router.post("/invoices/{invoice_id}/pay", response_model=dict)
async def mark_invoice_paid(
    invoice_id: str,
    payment: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark invoice as paid"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        invoice_uuid = UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    result = await db.execute(select(BillingTransaction).where(BillingTransaction.id == invoice_uuid))
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if txn.status == TransactionStatus.PAID:
        raise HTTPException(status_code=400, detail="Invoice already paid")
    
    # Update transaction
    txn.status = TransactionStatus.PAID
    txn.paid_at = datetime.utcnow()
    
    try:
        txn.payment_method = PaymentMethod(payment.method)
    except ValueError:
        txn.payment_method = PaymentMethod.PIX
    
    if payment.amount:
        txn.net_amount = Decimal(str(payment.amount))
    else:
        txn.net_amount = txn.amount
    
    await db.commit()
    await db.refresh(txn)
    
    account_name = ""
    if txn.account_id:
        acc_result = await db.execute(select(Account.company_name).where(Account.id == txn.account_id))
        account_name = acc_result.scalar_one_or_none() or ""
    
    return {
        "message": "Invoice marked as paid",
        "invoice": transaction_to_dict(txn, account_name, "")
    }


@router.post("/invoices/{invoice_id}/cancel", response_model=dict)
async def cancel_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an invoice"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        invoice_uuid = UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice ID format")
    
    result = await db.execute(select(BillingTransaction).where(BillingTransaction.id == invoice_uuid))
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if txn.status == TransactionStatus.PAID:
        raise HTTPException(status_code=400, detail="Cannot cancel a paid invoice")
    
    txn.status = TransactionStatus.CANCELLED
    txn.cancelled_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Invoice cancelled", "invoice_id": invoice_id}


# ==========================================
# TRANSACTION ROUTES
# ==========================================

@router.get("/transactions", response_model=dict)
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all transactions (paid invoices)"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = select(BillingTransaction).where(
        BillingTransaction.status == TransactionStatus.PAID
    ).order_by(BillingTransaction.paid_at.desc())
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    txn_data = []
    total_revenue = Decimal("0.00")
    
    for txn in transactions:
        account_name = ""
        if txn.account_id:
            acc_result = await db.execute(select(Account.company_name).where(Account.id == txn.account_id))
            account_name = acc_result.scalar_one_or_none() or ""
        
        total_revenue += txn.amount
        
        txn_data.append({
            "id": str(txn.id),
            "invoice_id": str(txn.id),
            "invoice_number": txn.invoice_number,
            "account_name": account_name,
            "amount": float(txn.amount),
            "amount_formatted": f"R$ {float(txn.amount):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "type": "payment",
            "method": txn.payment_method.value if txn.payment_method else "pix",
            "status": "completed",
            "created_at": txn.paid_at.isoformat() if txn.paid_at else None
        })
    
    return {
        "transactions": txn_data,
        "total": total,
        "total_revenue": float(total_revenue)
    }


# ==========================================
# STATISTICS ROUTES
# ==========================================

@router.get("/stats", response_model=dict)
async def get_billing_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get billing statistics"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get all transactions
    result = await db.execute(select(BillingTransaction))
    all_txns = result.scalars().all()
    
    # Calculate metrics
    paid_txns = [t for t in all_txns if t.status == TransactionStatus.PAID]
    pending_txns = [t for t in all_txns if t.status == TransactionStatus.PENDING]
    failed_txns = [t for t in all_txns if t.status == TransactionStatus.FAILED]
    
    total_revenue = sum(float(t.amount) for t in paid_txns)
    pending_amount = sum(float(t.amount) for t in pending_txns)
    
    # Calculate MRR (last 30 days paid transactions)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_paid = [t for t in paid_txns if t.paid_at and t.paid_at > thirty_days_ago]
    mrr = sum(float(t.amount) for t in recent_paid)
    
    # Current month stats
    current_month = datetime.utcnow().strftime("%Y-%m")
    this_month_txns = [t for t in all_txns if t.created_at and t.created_at.strftime("%Y-%m") == current_month]
    
    # Payment methods breakdown
    pix_count = len([t for t in paid_txns if t.payment_method == PaymentMethod.PIX])
    card_count = len([t for t in paid_txns if t.payment_method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD]])
    boleto_count = len([t for t in paid_txns if t.payment_method == PaymentMethod.BOLETO])
    
    return {
        "mrr": round(mrr, 2),
        "arr": round(mrr * 12, 2),
        "total_revenue": round(total_revenue, 2),
        "pending_amount": round(pending_amount, 2),
        "failed_amount": sum(float(t.amount) for t in failed_txns),
        "total_transactions": len(all_txns),
        "paid_transactions": len(paid_txns),
        "pending_transactions": len(pending_txns),
        "invoices_this_month": len(this_month_txns),
        "average_ticket": round(total_revenue / max(len(paid_txns), 1), 2),
        "payment_methods": {
            "pix": pix_count,
            "credit_card": card_count,
            "boleto": boleto_count
        },
        "growth": {
            "mrr_change": 0,  # Would calculate month-over-month change
            "transactions_change": 0
        }
    }


@router.get("/revenue/monthly", response_model=dict)
async def get_monthly_revenue(
    months: int = Query(6, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get monthly revenue breakdown"""
    if current_user.role.value not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get paid transactions from last N months
    start_date = datetime.utcnow() - timedelta(days=30 * months)
    
    result = await db.execute(
        select(BillingTransaction).where(
            and_(
                BillingTransaction.status == TransactionStatus.PAID,
                BillingTransaction.paid_at >= start_date
            )
        )
    )
    paid_txns = result.scalars().all()
    
    # Group by month
    monthly_data = {}
    for txn in paid_txns:
        if txn.paid_at:
            month_key = txn.paid_at.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"revenue": 0, "count": 0}
            monthly_data[month_key]["revenue"] += float(txn.amount)
            monthly_data[month_key]["count"] += 1
    
    # Format response
    months_list = []
    for month_key in sorted(monthly_data.keys()):
        months_list.append({
            "month": month_key,
            "revenue": round(monthly_data[month_key]["revenue"], 2),
            "transactions": monthly_data[month_key]["count"]
        })
    
    return {
        "monthly_revenue": months_list,
        "total_period": round(sum(m["revenue"] for m in months_list), 2)
    }
