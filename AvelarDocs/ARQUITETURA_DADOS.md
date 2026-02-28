# 🏗️ Arquitetura Híbrida de Dados - AvelarSys

## 🎯 Conceito

O AvelarSys utiliza uma **arquitetura híbrida inteligente** que combina:
- **☁️ Nuvem (Neon PostgreSQL)**: Dados críticos e leves do SaaS
- **🖥️ Local (Supabase Self-Hosted)**: Dados operacionais e pesados + Backend BaaS

---

## 💡 Por que Arquitetura Híbrida?

### 💰 **Economia Inteligente**
- **Neon cobra por**: Volume de dados + queries + conexões
- **Solução**: Dados pesados ficam no Supabase local (custo zero)
- **Resultado**: ~80% economia na infraestrutura cloud

### 🚀 **Performance Otimizada**
- **Dados SaaS (Neon)**: Podem ter latência (100-200ms aceitável)
- **Dados operacionais (Supabase local)**: Instantâneos (< 10ms, zero latência)
- **Solução**: Local = performance máxima, Neon = alta disponibilidade

### 🔒 **Segurança Balanceada**
- **Dados críticos**: Neon com backup + redundância em nuvem
- **Dados operacionais**: Supabase local com controle total
- **Resultado**: Melhor dos dois mundos

---

## ☁️ AvAdmin → Neon PostgreSQL (Nuvem Externa)

### **Responsabilidade**: SaaS Core
Gerencia apenas dados **críticos e leves** do negócio SaaS na nuvem (alta disponibilidade).

### **Tabelas e Volume Estimado:**

```sql
-- AUTHENTICATION & USERS
users (~ 1.000 registros máx)
├── id, email, password_hash, cpf, role
├── account_id, created_at, last_login
└── ~50KB por 1.000 usuários

-- SAAS ACCOUNTS  
accounts (~ 500 empresas máx)
├── id, company_name, cnpj, email, plan_id
├── enabled_modules, status, created_at
└── ~25KB por 500 contas

-- SUBSCRIPTION PLANS
plans (~ 20 planos máx)
├── id, name, price, billing_cycle
├── max_products, max_users, features
└── ~2KB total

-- BILLING & PAYMENTS
billing_transactions (~ 6.000/ano)
├── id, account_id, amount, status
├── neon_transaction_id, created_at, paid_at
└── ~300KB por ano

-- AUDIT & SECURITY
audit_logs (~ 50.000/ano)
├── id, user_id, action, resource_type
├── old_values, new_values, ip, timestamp  
└── ~2MB por ano

-- GLOBAL SETTINGS
settings (~ 50 registros)
├── id, key, value, module, updated_by
└── ~5KB total
```

### **Volume Total Neon**: ~3MB/ano 
**Custo Estimado**: $5-15/mês  
**Localização**: Nuvem (Neon Cloud)  
**Backup**: Automático + redundância

---

## 🖥️ StockTech + AxCell-OS → Supabase Self-Hosted (Local)

### **Responsabilidade**: Dados Operacionais Pesados
Gerencia todos os dados **pesados e volumosos** localmente com BaaS completo (Auth, Storage, Realtime).

### **Arquitetura:**
- **PostgreSQL local**: Banco de dados operacional
- **Supabase Kong Gateway**: API Gateway com autenticação
- **Storage local**: Arquivos e documentos
- **Realtime**: WebSockets para atualizações em tempo real
- **Docker**: Container self-hosted na máquina

### **Tabelas e Volume Estimado:**

```sql
-- STOCKTECH: PRODUCTS & MARKETPLACE
products (~ 50.000 produtos)
├── id, account_id, name, description, price
├── specifications (JSONB), category_id, brand_id
├── stock_quantity, images (JSONB), is_active
└── ~250MB (5KB por produto)

product_images (~ 200.000 imagens)
├── id, product_id, image_path, thumbnail_path
├── file_size, dimensions, is_primary
└── ~10GB metadata + ~100GB arquivos

transactions (~ 500.000 transações/ano)
├── id, buyer_id, seller_id, product_id
├── quantity, unit_price, total_amount, status
└── ~50MB por ano

product_analytics (~ 2M registros/ano)
├── product_id, date, views, contacts, sales
└── ~100MB por ano

-- AXCELLOS: ORDERS & OPERATIONS
orders (~ 100.000 ordens/ano)
├── id, order_number, customer_id, status
├── description, priority, due_date
├── assigned_to, completed_at
└── ~100MB (1KB por ordem)

order_items (~ 300.000 itens/ano)
├── id, order_id, product_id, quantity
├── unit_price, total_price, status
└── ~150MB por ano

customers (~ 10.000 clientes)
├── id, name, email, phone, address
├── city, state, zip, contact_person
└── ~40MB (4KB por cliente)

-- SHARED: AUTHENTICATION (Supabase Auth)
users (~ 500 usuários)
├── id, email, password_hash (Supabase)
├── role, department, created_at
└── ~30KB por 500 usuários

-- STORAGE (Supabase Storage)
attachments (~ 50.000 arquivos)
├── id, order_id, file_name, file_path
├── file_size, mime_type, uploaded_by
└── ~5GB de metadata + arquivos
```

### **Volume Total Supabase Local**: ~200GB/ano
**Custo**: Apenas hardware local (disco)  
**Localização**: Docker self-hosted na máquina  
**Backup**: Configurável localmente  
**Performance**: Zero latência (LAN local)

---

## 🔄 Comunicação Entre Módulos

### **Arquitetura de Comunicação Híbrida**

```
┌──────────────────────────────────────────────────────────────────┐
│                    NEON (Nuvem)                                   │
│              AvAdmin → PostgreSQL Cloud                           │
│        (Dados críticos: users, accounts, billing)                │
└──────────────────────────────────────────────────────────────────┘
                              ↓ API
┌──────────────────────────────────────────────────────────────────┐
│                 Nginx Docker (Reverse Proxy)                      │
│              (porta 80/443 - avelarsys-nginx)                    │
└──────────────────────────────────────────────────────────────────┘
           ↑                    ↑                    ↑
           │                    │                    │
      AxCell-OS          Supabase Kong         PHPMyAdmin
    (PHP-FPM 8.2)      (porta 8001)          (porta 9000)
    (CodeIgniter)      (API Gateway)         (Acesso BD)
       (localhost)        (Docker)            (localhost)
           │                    │
           └────────┬───────────┘
                    ↓
┌──────────────────────────────────────────────────────────────────┐
│        SUPABASE SELF-HOSTED (Docker Local)                        │
│    PostgreSQL + Kong Gateway + Auth + Storage + Realtime         │
│    (Dados operacionais: products, orders, analytics)             │
└──────────────────────────────────────────────────────────────────┘
```

### **Como os módulos se comunicam?**

```python
# AvAdmin (Node.js) precisa de dados do StockTech/AxCell-OS
# Exemplo: Dashboard com métricas de vendas e ordens

# 1. AvAdmin consulta próprio banco (NEON na nuvem)
const accounts = await neon.query(
  'SELECT * FROM accounts WHERE status = "active"'
)

# 2. Para cada conta, consulta Supabase local via API
const supabaseClient = createClient('http://supabase-kong:8001', API_KEY)
const salesData = await supabaseClient
  .from('product_analytics')
  .select('*')
  .eq('account_id', account.id)

# 3. Combina dados para dashboard
const dashboardData = {
  account: account,           // ← Dados do NEON (nuvem)
  sales: salesData,          // ← Dados do Supabase local
  revenue: calculateRevenue(salesData)
}
```

### **Padrões de Integração:**

1. **Supabase Kong Gateway**: API Gateway para banco local (porta 8001)
2. **Supabase Client SDK**: Acesso direto ao PostgreSQL local
3. **APIs RESTful**: Comunicação entre módulos CodeIgniter
4. **Supabase Realtime**: WebSockets para atualizações em tempo real
5. **Supabase Auth**: Autenticação centralizada no Supabase local
6. **Supabase Storage**: Arquivos e documentos locais

---

## 🛠️ Configuração Prática

### **Docker Compose**
```yaml
services:
  # Neon nao precisa container (externo na nuvem)
  
  # Supabase Self-Hosted (PostgreSQL local + Kong + Auth + Storage)
  supabase-db:
    image: supabase/postgres:15.8
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: supabase_admin
      POSTGRES_PASSWORD: supabase_password
    volumes:
      - supabase_data:/var/lib/postgresql/data

  supabase-kong:
    image: kong:2.8.1
    ports:
      - "8001:8000"
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: supabase-db
  
  # Nginx Docker (Reverse Proxy)
  avelarsys-nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ax.avelarcompany.com.br.conf:/etc/nginx/conf.d/ax.avelarcompany.com.br.conf:ro
      - ./nginx/banco.avelarcompany.dev.br.conf:/etc/nginx/conf.d/banco.avelarcompany.dev.br.conf:ro
```

### **Variáveis de Ambiente**
```bash
# AvAdmin usa NEON (nuvem)
NEON_DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/avadmin

# StockTech + AxCell-OS usam SUPABASE LOCAL (Docker)
SUPABASE_DATABASE_URL=postgresql://supabase_admin:password@localhost:5432/postgres
SUPABASE_KONG_URL=http://host.docker.internal:8001
SUPABASE_API_KEY=your_supabase_anon_key
```

### **Conexões nos Apps**
```python
# AvAdmin/backend/database.py (NEON - Nuvem)
from neon import create_connection
NEON_ENGINE = create_async_engine(settings.NEON_DATABASE_URL)

# StockTech/backend/database.py (SUPABASE - Local)
from supabase import create_client
SUPABASE_CLIENT = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# AxCell-OS/application/config/database.php (SUPABASE - Local)
$db['default'] = array(
    'hostname' => 'supabase-db',
    'database' => 'postgres',
    'username' => 'supabase_admin',
    'password' => 'supabase_password',
)
```

---

## 📊 Monitoramento

### **Métricas NEON** (AvAdmin - Nuvem)
- **Volume**: ~3MB/ano (tiny)
- **Queries**: ~1000/dia (leve)
- **Conexoes**: ~10 simultâneas
- **Latencia**: 100-200ms (aceitavel)
- **Custo**: $5-15/mes
- **Backup**: Automatico pela Neon

### **Métricas Supabase Local** (StockTech + AxCell-OS)
- **Volume**: ~200GB/ano (controlavel)
- **Queries**: ~100K/dia (pesado, mas local)
- **Performance**: <10ms (zero latencia via LAN)
- **Latencia**: <1ms (Docker local)
- **Custo**: $0 (apenas disco local)
- **Backup**: Configuravel localmente via Docker volumes

---

## ⚖️ Trade-offs

### ✅ **Vantagens**
- **Custo 80% menor** que tudo no Neon
- **Performance excelente** para operações pesadas
- **Separação clara** de responsabilidades (Neon vs Supabase local)
- **Escalabilidade independente** por módulo
- **BaaS completo** com Supabase local (Auth, Storage, Realtime)

### ⚠️ **Desvantagens**
- **Complexidade maior** de setup e manutenção
- **Backup local** precisa ser configurado e monitorado
- **Sincronização** entre módulos via API (pode ter lag)
- **Gerenciamento** de dois bancos de dados diferentes

---

## 🚀 Evolução Futura

### **Fase 1** (Atual): Hibrida Local
- Neon (AvAdmin dados criticos)
- Supabase Self-Hosted (StockTech + AxCell-OS dados pesados)
- Nginx Docker + PHP-FPM

### **Fase 2** (Crescimento): Hibrida Cloud
- Neon (dados criticos)
- AWS RDS/Google Cloud SQL (dados operacionais)
- Kubernetes orquestracao

### **Fase 3** (Escala): Full Microservices
- Neon + Multiplos bancos especializados por modulo
- Kubernetes com auto-scaling
- Replicacao geografica

---

**🏆 CONCLUIDO**: Documento atualizado com arquitetura CORRETA:
- NEON (Nuvem) para dados criticos AvAdmin
- SUPABASE SELF-HOSTED (Local Docker) para StockTech + AxCell-OS
- Nginx Docker como Reverse Proxy
- Performance otimizada com zero latencia local
