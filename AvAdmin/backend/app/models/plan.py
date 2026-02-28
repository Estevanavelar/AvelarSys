# ========================================
# AVADMIN - Plan Models (SaaS Subscription Plans)
# ========================================

import enum
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import Boolean, Column, Enum, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base

class BillingCycle(str, enum.Enum):
    """Billing cycle options"""
    MONTHLY = "monthly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"

class PlanType(str, enum.Enum):
    """Plan types by target audience"""
    INDIVIDUAL = "individual"       # Individual users
    BUSINESS = "business"          # Small businesses
    ENTERPRISE = "enterprise"      # Large enterprises
    CUSTOM = "custom"              # Custom plans

class PlanCategory(str, enum.Enum):
    """Plan categories for auto-detection of client_type"""
    LOJISTA = "lojista"              # Shopkeepers - create accounts
    DISTRIBUIDOR = "distribuidor"    # Distributors - create accounts
    CLIENTE_FINAL = "cliente_final"  # End customers - no accounts

class Plan(Base):
    """
    Plan model - SaaS Subscription Plans
    Defines what features and limits each tier has
    """
    __tablename__ = "plans"
    
    # Basic Information
    name = Column(String(50), nullable=False, index=True)  # "Lojista", "Empresa", etc.
    slug = Column(String(50), unique=True, nullable=False, index=True)  # "lojista", "empresa"
    description = Column(Text, nullable=True)
    
    # Pricing
    price = Column(Numeric(10, 2), nullable=False)  # 39.90, 89.90, etc.
    billing_cycle = Column(
        Enum(
            BillingCycle,
            name="billingcycle",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        default=BillingCycle.MONTHLY,
        nullable=False,
    )
    plan_type = Column(
        Enum(
            PlanType,
            name="plantype",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        default=PlanType.BUSINESS,
        nullable=False,
    )

    # Auto-detection category
    category = Column(
        Enum(
            PlanCategory,
            name="plancategory",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        comment="Categoria do plano para auto-detecção de client_type"
    )

    # Usage Limits
    max_users = Column(String, default="1", nullable=False)          # Maximum users per account
    max_products = Column(String, default="100", nullable=False)     # Maximum products
    max_transactions = Column(String, default="500", nullable=False)  # Monthly transactions
    max_storage_gb = Column(String, default="1", nullable=False)     # Storage in GB
    
    # Features (JSON structure for flexibility)
    features = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="""
        Features included in plan:
        {
            "modules": ["StockTech", "Lucrum"],
            "whatsapp_integration": true,
            "api_access": true,
            "custom_branding": false,
            "priority_support": false,
            "advanced_analytics": false,
            "export_data": true,
            "multi_location": false
        }
        """
    )
    
    # Plan configuration
    is_active = Column(Boolean, default=True, nullable=False)
    is_popular = Column(Boolean, default=False, nullable=False)  # Show "Most Popular" badge
    is_hidden = Column(Boolean, default=False, nullable=False)   # Hide from public listing
    
    # Trial settings
    trial_days = Column(String, default="7", nullable=False)     # Free trial period
    
    # Display settings
    display_order = Column(String, default="0", nullable=False)  # Order on pricing page
    color = Column(String(7), default="#3B82F6", nullable=False)  # Brand color hex
    
    # Relationships (will be defined after all models are loaded)
    # accounts = relationship("Account", back_populates="plan")
    # billing_transactions = relationship("BillingTransaction", back_populates="plan")
    
    def __repr__(self):
        return f"<Plan {self.name} (R$ {self.price}/{self.billing_cycle})>"
    
    @property
    def price_formatted(self) -> str:
        """Return formatted price: R$ 39,90"""
        return f"R$ {self.price:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    @property
    def monthly_price(self) -> Decimal:
        """Return equivalent monthly price"""
        if self.billing_cycle == BillingCycle.MONTHLY:
            return self.price
        elif self.billing_cycle == BillingCycle.YEARLY:
            return self.price / 12
        else:  # LIFETIME
            return Decimal("0.00")
    
    @property
    def yearly_discount_percentage(self) -> float:
        """Calculate yearly discount percentage"""
        if self.billing_cycle != BillingCycle.YEARLY:
            return 0.0
        
        monthly_equivalent = self.price / 12
        yearly_monthly_price = monthly_equivalent * 12
        savings = yearly_monthly_price - self.price
        
        return float((savings / yearly_monthly_price) * 100)
    
    def has_feature(self, feature_name: str) -> bool:
        """Check if plan includes specific feature"""
        return self.features.get(feature_name, False) is True
    
    def get_enabled_modules(self) -> List[str]:
        """Get list of enabled modules for this plan"""
        return self.features.get("modules", [])
    
    def can_access_module(self, module_name: str) -> bool:
        """Check if plan can access specific module"""
        enabled_modules = self.get_enabled_modules()
        return module_name in enabled_modules
    
    def get_limits_dict(self) -> Dict[str, int]:
        """Get all limits as dictionary"""
        return {
            "users": int(self.max_users),
            "products": int(self.max_products),
            "transactions": int(self.max_transactions),
            "storage_gb": int(self.max_storage_gb),
            "trial_days": int(self.trial_days)
        }
    
    def compare_with(self, other_plan: 'Plan') -> Dict[str, str]:
        """Compare this plan with another plan"""
        comparison = {}
        
        # Price comparison
        if self.price > other_plan.price:
            comparison["price"] = "higher"
        elif self.price < other_plan.price:
            comparison["price"] = "lower"
        else:
            comparison["price"] = "same"
        
        # Features comparison
        my_features = set(self.features.keys())
        other_features = set(other_plan.features.keys())
        
        comparison["exclusive_features"] = list(my_features - other_features)
        comparison["missing_features"] = list(other_features - my_features)
        
        return comparison
    
    @classmethod
    def get_popular_plan(cls):
        """Get the plan marked as popular"""
        # This would be implemented in the service layer
        pass
    
    @classmethod
    def get_default_plan(cls):
        """Get the default plan for new signups"""
        # This would be implemented in the service layer
        pass