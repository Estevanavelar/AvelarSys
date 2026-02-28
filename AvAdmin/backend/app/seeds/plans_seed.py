"""
Seed data for plans with categories for auto-detection
Run with: python -m app.seeds.plans_seed
"""

from app.models.plan import Plan, PlanCategory, PlanType, BillingCycle
from app.core.database import get_db_session
from decimal import Decimal

PLANS_SEED_DATA = [
    {
        "name": "Lojista Básico",
        "slug": "lojista-basico",
        "description": "Plano básico para lojistas iniciantes",
        "category": PlanCategory.LOJISTA,
        "plan_type": PlanType.BUSINESS,
        "billing_cycle": BillingCycle.MONTHLY,
        "price": Decimal("99.90"),
        "max_users": "3",
        "max_products": "500",
        "max_transactions": "2000",
        "max_storage_gb": "5",
        "features": {
            "modules": ["AxCellOS", "StockTech"],
            "whatsapp_integration": True,
            "api_access": False,
            "custom_branding": False,
            "priority_support": False,
            "advanced_analytics": False,
            "export_data": True,
            "multi_location": False
        },
        "is_active": True,
        "is_popular": False,
        "trial_days": "14",
        "display_order": "1",
        "color": "#10B981",
        "is_hidden": False
    },
    {
        "name": "Lojista Profissional",
        "slug": "lojista-profissional",
        "description": "Plano completo para lojistas estabelecidos",
        "category": PlanCategory.LOJISTA,
        "plan_type": PlanType.BUSINESS,
        "billing_cycle": BillingCycle.MONTHLY,
        "price": Decimal("199.90"),
        "max_users": "10",
        "max_products": "2000",
        "max_transactions": "10000",
        "max_storage_gb": "20",
        "features": {
            "modules": ["AxCellOS", "StockTech"],
            "whatsapp_integration": True,
            "api_access": True,
            "custom_branding": True,
            "priority_support": False,
            "advanced_analytics": True,
            "export_data": True,
            "multi_location": True
        },
        "is_active": True,
        "is_popular": True,
        "trial_days": "30",
        "display_order": "2",
        "color": "#3B82F6",
        "is_hidden": False
    },
    {
        "name": "Distribuidor",
        "slug": "distribuidor",
        "description": "Plano especializado para distribuidores e atacadistas",
        "category": PlanCategory.DISTRIBUIDOR,
        "plan_type": PlanType.ENTERPRISE,
        "billing_cycle": BillingCycle.MONTHLY,
        "price": Decimal("399.90"),
        "max_users": "25",
        "max_products": "10000",
        "max_transactions": "50000",
        "max_storage_gb": "100",
        "features": {
            "modules": ["AxCellOS", "StockTech"],
            "whatsapp_integration": True,
            "api_access": True,
            "custom_branding": True,
            "priority_support": True,
            "advanced_analytics": True,
            "export_data": True,
            "multi_location": True,
            "b2b_marketplace": True,
            "bulk_operations": True
        },
        "is_active": True,
        "is_popular": False,
        "trial_days": "30",
        "display_order": "3",
        "color": "#8B5CF6",
        "is_hidden": False
    },
    {
        "name": "Cliente Final",
        "slug": "cliente-final",
        "description": "Acesso básico para consumidores finais",
        "category": PlanCategory.CLIENTE_FINAL,
        "plan_type": PlanType.INDIVIDUAL,
        "billing_cycle": BillingCycle.MONTHLY,
        "price": Decimal("0.00"),
        "max_users": "1",
        "max_products": "0",
        "max_transactions": "0",
        "max_storage_gb": "0",
        "features": {
            "modules": [],
            "whatsapp_integration": False,
            "api_access": False,
            "custom_branding": False,
            "priority_support": False,
            "advanced_analytics": False,
            "export_data": False,
            "multi_location": False
        },
        "is_active": True,
        "is_popular": False,
        "trial_days": "0",
        "display_order": "4",
        "color": "#6B7280",
        "is_hidden": True
    }
]


def seed_plans():
    """Seed the database with plans"""
    db = next(get_db_session())

    try:
        for plan_data in PLANS_SEED_DATA:
            # Check if plan already exists
            existing = db.query(Plan).filter(Plan.slug == plan_data["slug"]).first()

            if existing:
                print(f"Plan {plan_data['slug']} already exists, skipping...")
                continue

            # Create new plan
            plan = Plan(**plan_data)
            db.add(plan)
            print(f"Created plan: {plan.name} ({plan.category.value})")

        db.commit()
        print("✅ Plans seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding plans: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_plans()