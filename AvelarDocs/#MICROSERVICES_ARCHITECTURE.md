# 🏗️ Arquitetura Microservices - AvelarSys

## 🎯 Visão Geral

Cada módulo do AvelarSys é um **microserviço independente** com seu próprio banco de dados, permitindo desenvolvimento, deploy e escalabilidade separados.

## 📊 Arquitetura de Dados

### 🏢 **AvAdmin** - SaaS Core (Neon PostgreSQL)
**Responsabilidade**: Gerencia dados críticos do SaaS

```sql
-- USUÁRIOS (User Authority)
users {
  id: uuid PRIMARY KEY,
  account_id: uuid → accounts.id,
  full_name: varchar(100),
  cpf: varchar(11) UNIQUE,          -- Login principal
  whatsapp: varchar(15),
  password_hash: varchar(255),
  role: enum('admin', 'user'),
  whatsapp_verified: boolean,
  created_at: timestamp
}

-- EMPRESAS CLIENTES
accounts {
  id: uuid PRIMARY KEY,
  company_name: varchar(100),
  cnpj: varchar(14) UNIQUE,
  whatsapp: varchar(15),
  responsible_name: varchar(100),
  plan_id: uuid → plans.id,
  enabled_modules: jsonb,           -- ['StockTech', 'Lucrum']
  status: enum('active', 'suspended'),
  whatsapp_verified: boolean,
  created_at: timestamp
}

-- PLANOS SaaS
plans {
  id: uuid PRIMARY KEY,
  name: varchar(50),                -- 'Lojista', 'Empresa', 'Corporativo'
  price: decimal(10,2),
  billing_cycle: enum('monthly', 'yearly'),
  max_products: integer,
  max_users: integer,
  features: jsonb,
  is_active: boolean,
  created_at: timestamp
}

-- PAGAMENTOS
billing_transactions {
  id: uuid PRIMARY KEY,
  account_id: uuid → accounts.id,
  plan_id: uuid → plans.id,
  amount: decimal(10,2),
  mercadopago_id: varchar(100),
  status: enum('pending', 'paid', 'failed'),
  paid_at: timestamp,
  created_at: timestamp
}
```

### 📱 **StockTech** - Marketplace B2B (PostgreSQL Docker)
**Responsabilidade**: Dados operacionais do marketplace

```sql
-- PRODUTOS
products {
  id: uuid PRIMARY KEY,
  account_id: uuid,                 -- Referência para AvAdmin
  user_id: uuid,                    -- Referência para AvAdmin
  code: varchar(20) UNIQUE,         -- ST123456A
  name: varchar(200),
  description: text,
  category_id: uuid → categories.id,
  brand_id: uuid → brands.id,
  price: decimal(10,2),
  stock_quantity: integer,
  images: jsonb,                    -- URLs das imagens
  specifications: jsonb,
  is_active: boolean,
  created_at: timestamp
}

-- TRANSAÇÕES DO MARKETPLACE
transactions {
  id: uuid PRIMARY KEY,
  buyer_id: uuid,                   -- Referência para AvAdmin
  seller_id: uuid,                  -- Referência para AvAdmin
  product_id: uuid → products.id,
  quantity: integer,
  unit_price: decimal(10,2),
  total_amount: decimal(10,2),
  whatsapp_chat_id: varchar(100),
  status: enum('pending', 'completed', 'cancelled'),
  created_at: timestamp
}

-- CATEGORIAS E MARCAS
categories {
  id: uuid PRIMARY KEY,
  name: varchar(50) UNIQUE,
  description: text,
  icon: varchar(50),
  is_active: boolean
}

brands {
  id: uuid PRIMARY KEY,
  name: varchar(50) UNIQUE,
  logo_url: varchar(255),
  is_active: boolean
}
```

### 💰 **Lucrum** - Sistema Financeiro (PostgreSQL Docker)
**Responsabilidade**: Gestão financeira das empresas

```sql
-- CONTAS BANCÁRIAS
bank_accounts {
  id: uuid PRIMARY KEY,
  account_id: uuid,                 -- Referência para AvAdmin
  bank_code: varchar(10),
  agency: varchar(10),
  account_number: varchar(20),
  account_type: enum('checking', 'savings'),
  balance: decimal(15,2),
  is_active: boolean,
  created_at: timestamp
}

-- TRANSAÇÕES FINANCEIRAS
financial_transactions {
  id: uuid PRIMARY KEY,
  account_id: uuid,                 -- Referência para AvAdmin
  bank_account_id: uuid → bank_accounts.id,
  code: varchar(20) UNIQUE,         -- LC12345678A
  description: text,
  amount: decimal(15,2),
  type: enum('income', 'expense'),
  category: varchar(50),
  transaction_date: date,
  created_at: timestamp
}
```

---

## 🔄 Comunicação Entre Módulos

### **Padrão HTTP REST**

#### **StockTech → AvAdmin**
```python
# StockTech precisa validar usuário
async def validate_user(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.AVADMIN_API_URL}/api/users/{user_id}"
        )
        return response.json()

# StockTech precisa verificar plano da empresa
async def check_company_plan(account_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.AVADMIN_API_URL}/api/accounts/{account_id}/plan"
        )
        return response.json()
```

#### **Lucrum → AvAdmin**
```python
# Lucrum precisa dos dados da empresa
async def get_company_details(account_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.AVADMIN_API_URL}/api/accounts/{account_id}"
        )
        return response.json()
```

### **APIs Expostas pelo AvAdmin**

```python
# AvAdmin/backend/app/routes/internal_api.py

@router.get("/api/users/{user_id}")
async def get_user_details(user_id: str):
    """API interna para outros módulos"""
    return {
        "id": user_id,
        "full_name": "João Silva",
        "cpf": "12345678900",
        "whatsapp": "+5511999999999",
        "account_id": "uuid-account",
        "role": "user",
        "is_active": True
    }

@router.get("/api/accounts/{account_id}")
async def get_account_details(account_id: str):
    """Dados da empresa para outros módulos"""
    return {
        "id": account_id,
        "company_name": "Empresa Demo LTDA",
        "cnpj": "12345678000100",
        "whatsapp": "+5511888888888",
        "enabled_modules": ["StockTech", "Lucrum"],
        "status": "active",
        "plan": {
            "name": "Empresa",
            "max_products": 500,
            "max_users": 5
        }
    }

@router.get("/api/accounts/{account_id}/plan")
async def get_account_plan(account_id: str):
    """Plano específico da empresa"""
    return {
        "name": "Empresa",
        "max_products": 500,
        "max_users": 5,
        "max_transactions": 2000,
        "features": ["whatsapp", "api_access"],
        "status": "active"
    }
```

---

## 🐳 Configuração Docker

### **Bancos de Dados Separados**

```yaml
# AvAdmin: Neon PostgreSQL (Externo)
NEON_DATABASE_URL=postgresql://user:pass@neon-host/db

# StockTech: PostgreSQL Docker (Porta 5433)
postgres-stocktech:
  ports: "5433:5432"
  POSTGRES_DB: stocktech
  
# Lucrum: PostgreSQL Docker (Porta 5434)  
postgres-lucrum:
  ports: "5434:5432"
  POSTGRES_DB: lucrum
```

### **Comunicação Interna**

```yaml
# StockTech pode chamar AvAdmin
stocktech-backend:
  environment:
    - AVADMIN_API_URL=http://avadmin-backend:8000
  depends_on:
    - avadmin-backend    # Garante que AvAdmin suba primeiro

# Lucrum pode chamar AvAdmin
lucrum-backend:
  environment:
    - AVADMIN_API_URL=http://avadmin-backend:8000
  depends_on:
    - avadmin-backend
```

---

## 🔒 Autenticação Distribuída

### **JWT Compartilhado**
- AvAdmin gera JWT tokens
- Outros módulos validam usando mesma chave secreta
- Token contém informações básicas do usuário

```python
# JWT Payload padrão
{
  "user_id": "uuid",
  "account_id": "uuid", 
  "role": "user",
  "enabled_modules": ["StockTech", "Lucrum"],
  "exp": 1234567890
}
```

### **Middleware de Autenticação**

```python
# shared/auth/middleware.py
async def verify_jwt_token(token: str):
    """Middleware compartilhado entre módulos"""
    payload = jwt.decode(token, settings.JWT_SECRET)
    
    # Busca dados atualizados do AvAdmin se necessário
    if should_refresh_user_data(payload):
        user = await get_user_from_avadmin(payload['user_id'])
        return user
    
    return payload
```

---

## 📊 Monitoramento Distribuído

### **Health Checks por Módulo**

```python
# Cada módulo expõe /health
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "module": "StockTech",
        "database": "connected",
        "redis": "connected",
        "avadmin_api": "reachable",     # Testa comunicação
        "timestamp": datetime.utcnow()
    }
```

### **Logs Centralizados**

```python
# shared/logging/config.py
logging.config.dictConfig({
    "formatters": {
        "default": {
            "format": "[{module}] {levelname}: {message}",
            "style": "{"
        }
    }
})
```

---

## 🚀 Vantagens da Arquitetura

### ✅ **Desenvolvimento**
- **Equipes independentes**: Cada dev pode focar em um módulo
- **Deploy independente**: StockTech v2.0 não afeta AvAdmin v1.5
- **Tecnologias flexíveis**: Cada módulo pode usar stack diferente
- **Testes isolados**: Quebrou StockTech? AvAdmin continua funcionando

### ✅ **Operação**
- **Scaling granular**: Só StockTech com carga? Escala só ele
- **Backup específico**: Dados críticos (Neon) vs operacionais (local)
- **Manutenção focada**: Update de banco só afeta um módulo
- **Monitoramento detalhado**: Métricas por módulo

### ✅ **Negócio**
- **Produtos modulares**: Cliente paga só pelos módulos que usa
- **Lançamento rápido**: Novo módulo não depende dos outros
- **Customização**: Módulo específico para cliente enterprise
- **Parceria**: Terceiros podem criar módulos compatíveis

---

## ⚠️ **Desafios e Soluções**

### **Consistência de Dados**
```python
# Problema: StockTech tem user_id mas usuário foi deletado no AvAdmin
# Solução: Validação antes de operações críticas
async def create_product(user_id: str, product_data: dict):
    user = await avadmin_client.get_user(user_id)
    if not user or not user.is_active:
        raise HTTPException(404, "Usuário inválido")
    
    return await product_service.create(user_id, product_data)
```

### **Latência de Comunicação**
```python
# Problema: Toda operação precisa consultar AvAdmin
# Solução: Cache Redis com TTL
@cache.cached(ttl=300)  # 5 minutos
async def get_user_cached(user_id: str):
    return await avadmin_client.get_user(user_id)
```

### **Falha de Comunicação**
```python
# Problema: AvAdmin fora do ar
# Solução: Circuit breaker + fallback
@circuit_breaker.call
async def get_user_with_fallback(user_id: str):
    try:
        return await avadmin_client.get_user(user_id)
    except Exception:
        return await local_cache.get_user(user_id)  # Última versão conhecida
```

---

**🏆 Resultado: Arquitetura escalável, resiliente e flexível para crescimento do negócio!**