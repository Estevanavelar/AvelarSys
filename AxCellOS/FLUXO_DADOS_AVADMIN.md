# Fluxo de Dados: Integração AvAdmin ↔ AxCellOS ↔ StockTech

## Visão Geral

Este documento descreve a arquitetura de dados e os fluxos de sincronização entre os três bancos de dados do sistema:

1. **AvAdmin (Neon DB)** - Fonte central de autenticação e cadastro
2. **AxCellOS (avelar_axcellos)** - Sistema de gerenciamento de lojas e vendas
3. **StockTech** - Sistema de controle de estoque 

**🔑 Características Principais**: 
- Auto-detecção automática de tipo de usuário baseada em categoria de plano
- Apenas lojistas e distribuidores acessam AxCellOS e StockTech
- Clientes finais NÃO fazem login
- Uma única entidade por proprietário (migração CPF→CNPJ, nunca ambas)

---

# 📦 AvAdmin Database (Neon DB)

## Visão Geral

AvAdmin é a **fonte central de dados** de autenticação, cadastro de empresas e gestão de planos. É o ponto de entrada para todo o sistema.

## Arquitetura de Dados - AvAdmin

```
┌─────────────────────────────────────────────────────────────┐
│                        AVADMIN (NEON)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │       accounts          │    │         users           │ │
│  │─────────────────────────│    │─────────────────────────│ │
│  │ id: CPF ou CNPJ         │←──→│ id (PK): CPF            │ │
│  │ document                │    │ full_name               │ │
│  │ document_type: cpf|cnpj │    │ cpf                     │ │
│  │ business_name           │    │ whatsapp                │ │
│  │ owner_cpf → users.cpf   │    │ password_hash           │ │
│  │ is_individual: bool     │    │ account_id → accounts   │ │
│  │ previous_document (hist)│    │ client_type (AUTO)      │ │
│  │ status                  │    │ role: admin|user|viewer │ │
│  │ enabled_modules []      │    │ enabled_modules []      │ │
│  │ plan_id → plans         │    └─────────────────────────┘ │
│  └─────────────────────────┘                                 │
│                                                              │
│  ┌─────────────────────────┐                                │
│  │       plans             │                                │
│  │─────────────────────────│                                │
│  │ id (UUID)               │                                │
│  │ name                    │                                │
│  │ slug                    │                                │
│  │ category: 'lojista'|    │ ← Define automaticamente       │
│  │           'distribuidor'│   o tipo de user               │
│  │           'cliente'     │                                │
│  │ price                   │                                │
│  │ features                │                                │
│  │ max_users, max_products │                                │
│  └─────────────────────────┘                                │
│                                                              │
│  ⚡ AUTO-DETECÇÃO AUTOMÁTICA (AppPortal):                   │
│  • User escolhe plano com category definida                 │
│  • Sistema detecta: 'lojista'|'distribuidor'|'cliente'      │
│  • Define client_type + cria/atualiza account               │
│  • Apenas lojistas e distribuidores vão acessar AxCellOS    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Premissas Importantes - AvAdmin

### 1. Apenas Lojistas e Distribuidores Criam Accounts
- ❌ Clientes finais NÃO criam accounts
- ✅ Lojistas PF/PJ (CPF ou CNPJ) criam accounts
- ✅ Distribuidores criam accounts
- 🔐 Validação automática: `client_type = 'cliente_final'` → sem account

### 2. Uma Única Entidade por Proprietário
- ❌ Não pode ter CPF + CNPJ separados para o mesmo proprietário
- ✅ Se abre CNPJ, **migra** de CPF para CNPJ
- 📝 Histórico mantido em `previous_document` da account

### 3. Auto-Detecção Automática via Plano
- ✅ Plano com `category='lojista'` → cria account, `client_type='lojista'`
- ✅ Plano com `category='distribuidor'` → cria account, `client_type='distribuidor'`
- ✅ Plano com `category='cliente_final'` → sem account, `client_type='cliente_final'`

### 4. owner_cpf para Multi-Tenancy
- ✅ Mantém referência de quem é o proprietário de cada empresa
- Permite consolidação de múltiplas empresas do mesmo dono
- Facilita filtros por dono

---

## Tabelas - AvAdmin

### users (Pessoas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR(11) PK | CPF (sempre a chave primária de pessoa) |
| `full_name` | VARCHAR(100) | Nome completo |
| `cpf` | VARCHAR(11) UNIQUE | CPF (redundante, igual id) |
| `whatsapp` | VARCHAR(15) | WhatsApp de contato |
| `password_hash` | VARCHAR(255) | Hash da senha |
| `account_id` | VARCHAR(14) FK | Vinculação à account (CPF ou CNPJ) |
| `client_type` | VARCHAR(20) | **AUTO-DETECTADO**: lojista / distribuidor / cliente_final |
| `role` | VARCHAR(20) | Papel: admin / user / viewer |
| `is_active` | BOOLEAN | Ativo no sistema |
| `created_at` | TIMESTAMP | Data de criação |

**Sincronização:**
- Criado no registro do AppPortal
- `client_type` definido automaticamente baseado em categoria do plano contratado

---

### accounts (Empresas/Lojas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR(14) PK | CPF (PF) ou CNPJ (PJ) - **Entidade única** |
| `document` | VARCHAR(14) | Cópia do documento |
| `document_type` | VARCHAR(4) | 'cpf' ou 'cnpj' |
| `business_name` | VARCHAR(100) | Nome fantasia da empresa |
| `owner_cpf` | VARCHAR(11) FK | CPF do proprietário (multi-tenancy) |
| `is_individual` | BOOLEAN | Pessoa física? |
| `previous_document` | VARCHAR(14) | Documento anterior (migração CPF→CNPJ) |
| `status` | VARCHAR(20) | active / suspended / cancelled |
| `plan_id` | UUID FK | Plano contratado |
| `enabled_modules` | JSONB | Módulos habilitados |
| `created_at` | TIMESTAMP | Data de criação |

**Regra de Entidade Única:**
- Um proprietário = UMA account
- Se migra de CPF para CNPJ, **atualiza a account**, não cria nova
- `previous_document` mantém histórico

---

### plans (Planos de Serviço)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador único |
| `name` | VARCHAR(100) | Nome (Lojista, Distribuidor, Cliente Final) |
| `slug` | VARCHAR(100) | URL-friendly |
| `category` | VARCHAR(20) | **'lojista' / 'distribuidor' / 'cliente_final'** |
| `price` | DECIMAL | Preço mensal |
| `features` | JSONB | Recursos inclusos |
| `max_users` | INTEGER | Limite de usuários |
| `max_products` | INTEGER | Limite de produtos |
| `created_at` | TIMESTAMP | Data de criação |

**Uso:**
- `category` determina automaticamente `client_type` do user
- Define se terá acesso ao AxCellOS e StockTech

---

## Auto-Detecção no AvAdmin

```
┌─────────────────────────────────────────┐
│  Usuário contrata plano (AppPortal)     │
│  POST /subscribe                        │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴─────────────┐
         │                       │
    category?                    │
         │                       │
    ┌────┼────┬────────────────┐ │
    │    │    │                │ │
 'lojista' 'distribuidor' 'cliente_final'
    │    │    │                │ │
  CREATE CREATE            NULL
  ACCOUNT ACCOUNT        account
  (CPF/CNPJ)
    │    │    │                │ │
  SET:  SET:  │            SET:
  • client_type  │         • client_type
  • account_id   │         • account_id = null
  • role=admin   │         • role = user
    │    │    │                │ │
    └────┼────┴────────────────┘ │
         │
    ┌────┴───────────────────┐
    │                        │
 SIM AvAdmin   TEM ACCOUNT
    │    │
    ├────┴─ NÃO
    │     (cliente_final)
```

---

## Endpoints - AvAdmin

### POST /register/cpf
Cadastro inicial de usuário (SEM client_type definido)

```typescript
registerUserCPF(
  cpf: string,
  name: string,
  whatsapp: string
): User
```

---

### GET /plans
Retorna planos com categoria para escolha do usuário

```typescript
listPlans(
  category?: 'lojista' | 'distribuidor' | 'cliente_final'
): Plan[]
```

---

### POST /subscribe
**PRINCIPAL**: Contrata plano e ATIVA auto-detecção

```typescript
async subscribeToPlan(cpf: string, plan_id: string) {
  const plan = await getPlan(plan_id);
  const category = plan.category;
  
  // Auto-detecção automática:
  if (category === 'lojista' || category === 'distribuidor') {
    // Cria/atualiza account
    const account = await createOrUpdateAccount(cpf, category);
    
    // Atualiza user
    updateUser(cpf, {
      client_type: category,
      account_id: account.id,
      role: category === 'lojista' ? 'admin' : 'user'
    });
  } else if (category === 'cliente_final') {
    // Mantém como cliente
    updateUser(cpf, {
      client_type: 'cliente_final',
      account_id: null,
      role: 'user'
    });
  }
  
  createBillingTransaction(cpf, plan_id);
}
```

---

### GET /me
Retorna dados do usuário logado

```typescript
getCurrentUser(): User
```

---

# 🏪 AxCellOS Database (avelar_axcellos)

## Visão Geral

AxCellOS é o **sistema de gerenciamento de lojas e vendas**. Sincroniza dados do AvAdmin e mantém dados locais de operação (produtos, ordens, vendas).

**Acesso:** ✅ Lojistas e Distribuidores | ❌ Clientes Finais

## Arquitetura de Dados - AxCellOS

```
┌─────────────────────────────────────────────────────────────┐
│                   AXCELLOS (avelar_axcellos)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │    users (EMPRESAS)     │    │ customers (CLIENTES)    │ │
│  │─────────────────────────│    │─────────────────────────│ │
│  │ id: CPF ou CNPJ         │←───│ account_id → users.id   │ │
│  │ account_id (vinculado)  │    │ id (PK): CPF            │ │
│  │ owner_cpf (rastreio)    │    │ name (cache)            │ │
│  │ business_name           │    │ whatsapp (cache)        │ │
│  │ enabled_modules         │    │ notes (local)           │ │
│  │ last_sync_at            │    │ last_sync_at            │ │
│  └─────────────────────────┘    └─────────────────────────┘ │
│          ↑                               ↑                   │
│          │                               │                   │
│    Sincronizado de              Sincroniza users com         │
│    accounts do AvAdmin          client_type='cliente_final'  │
│    (lojista ou distribuidor)    account_id=NULL              │
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │        orders           │    │         sales           │ │
│  │─────────────────────────│    │─────────────────────────│ │
│  │ account_id → users.id   │    │ account_id → users.id   │ │
│  │ customer_id → customers │    │ customer_id → customers │ │
│  │ operator_cpf (AvAdmin)  │    │ operator_cpf (AvAdmin)  │ │
│  └─────────────────────────┘    └─────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │       products          │    │        devices          │ │
│  │─────────────────────────│    │─────────────────────────│ │
│  │ account_id → users.id   │    │ account_id → users.id   │ │
│  │ (dados 100% locais)     │    │ operator_cpf (AvAdmin)  │ │
│  └─────────────────────────┘    └─────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Premissas Importantes - AxCellOS

### 1. Apenas Lojistas e Distribuidores Acessam
- ❌ Clientes finais NÃO fazem login
- ✅ Lojistas PF/PJ acessam normalmente
- ✅ Distribuidores acessam normalmente
- 🔐 Validação no middleware: rejeita se `client_type = 'cliente_final'`

### 2. Clientes Sincronizados São APENAS "cliente_final"
- ✅ Sincroniza users com `client_type = 'cliente_final'` E `account_id IS NULL`
- ❌ Nunca sincroniza lojistas como clientes

### 3. owner_cpf Sincronizado para Rastreabilidade
- ✅ Mantém referência de quem é o proprietário de cada empresa
- Permite consolidação multi-tenancy
- Facilita filtros por dono

---

## Tabelas - AxCellOS

### users (Sincroniza TUDO de AvAdmin accounts)

**⚡ IMPORTANTE: Tabela `users` puxa TODAS as informações de `AvAdmin.accounts`**

| Campo | Tipo | Origem | Descrição |
|-------|------|--------|-----------|
| `id` | VARCHAR(14) PK | accounts.id | CPF ou CNPJ (pode ser um ou outro) |
| `document_type` | ENUM | accounts.document_type | 'cpf' ou 'cnpj' |
| `document` | VARCHAR(14) | accounts.document | Documento sem formatação |
| `business_name` | VARCHAR(255) | accounts.business_name | Nome da empresa/loja |
| `owner_cpf` | VARCHAR(11) | accounts.owner_cpf | CPF do dono (para multi-tenancy) |
| `is_individual` | BOOLEAN | accounts.is_individual | É pessoa física? |
| `whatsapp` | VARCHAR(20) | accounts.whatsapp | WhatsApp da loja |
| `status` | VARCHAR(50) | accounts.status | Ativo/Inativo |
| `enabled_modules` | JSON | accounts.enabled_modules | Módulos habilitados |
| `previous_document` | VARCHAR(14) | accounts.previous_document | Doc anterior (CPF→CNPJ) |
| `plan_id` | UUID | accounts.plan_id | Plano contratado |
| `client_type` | ENUM | users.client_type | 'lojista' / 'distribuidor' (apenas estes) |
| `last_sync_at` | TIMESTAMP | system | Última sincronização com AvAdmin |
| `createdAt` | TIMESTAMP | accounts.createdAt | Data de criação |
| `updatedAt` | TIMESTAMP | accounts.updatedAt | Data de atualização |

**Lógica de Sincronização (Tenta PJ → CPF Lojista → Nome):**

```typescript
async function syncUserFromAvAdminAccount(token: string) {
  const user = await validateTokenWithAvAdmin(token);
  
  // ⚡ VALIDAÇÃO: Rejeitar cliente_final em login
  // (mas sincronizar como customer, não como user)
  if (user.client_type === 'cliente_final') {
    throw new Error('403: Clientes finais não acessam AxCellOS');
  }
  
  // ⚡ VALIDAÇÃO: Ser lojista ou distribuidor
  if (!['lojista', 'distribuidor'].includes(user.client_type)) {
    throw new Error('403: Acesso restrito a lojistas e distribuidores');
  }
  
  // ⚡ LÓGICA DE NOME:
  // 1. Se tem business_name → usa business_name
  // 2. Se não tiver → usa full_name do usuário AvAdmin
  
  // ⚡ SINCRONIZAÇÃO: Puxa TUDO de AvAdmin.accounts
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, user.account_id)
  });
  
  if (!existingUser) {
    await db.insert(users).values({
      id: user.account_id,                          // ← CPF ou CNPJ
      document_type: user.account_document_type,   // ← 'cpf' ou 'cnpj'
      document: user.account_document,              // ← Sem formatação
      business_name: user.account_business_name,   // ← De accounts
      owner_cpf: user.account_owner_cpf,           // ← De accounts
      is_individual: user.is_individual,           // ← De accounts
      whatsapp: user.account_whatsapp,             // ← De accounts
      status: user.account_status,                 // ← De accounts
      enabled_modules: user.enabled_modules,       // ← De accounts (JSON)
      previous_document: user.previous_document,   // ← De accounts
      plan_id: user.plan_id,                       // ← De accounts
      client_type: user.client_type,               // ← Do users AvAdmin
      last_sync_at: new Date(),
      createdAt: user.account_created_at,
      updatedAt: new Date(),
    });
  } else {
    // Atualiza campos de accounts
    await db.update(users)
      .set({
        document_type: user.account_document_type,
        document: user.account_document,
        business_name: user.account_business_name,
        owner_cpf: user.account_owner_cpf,
        is_individual: user.is_individual,
        whatsapp: user.account_whatsapp,
        status: user.account_status,
        enabled_modules: user.enabled_modules,
        previous_document: user.previous_document,
        plan_id: user.plan_id,
        client_type: user.client_type,
        last_sync_at: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.account_id));
  }
}
```

**Sincronização Automática:**
- ✅ No primeiro login do lojista/distribuidor
- ✅ Toda vez que faz login (valida se dados mudaram)
- ✅ TUDO vem de AvAdmin (nunca sobrescreve)
- ✅ Se trocar de CPF para CNPJ: `previous_document` rastreia
- ✅ Nome exibido: business_name (prioridade) → full_name (fallback)

---

### customers (Clientes Finais)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR(11) PK | CPF do cliente (vem de users.cpf AvAdmin) |
| `account_id` | VARCHAR(14) FK | CNPJ/CPF da empresa dona |
| `name` | VARCHAR(100) | Cache do nome |
| `whatsapp` | VARCHAR(15) | Cache do WhatsApp |
| `notes` | TEXT | Observações locais do lojista |
| `last_sync_at` | TIMESTAMP | Última sincronização com AvAdmin |

**Filtro de sincronização:**
- ✅ APENAS users com `client_type = 'cliente_final'` E `account_id IS NULL`
- ❌ NUNCA sincroniza lojistas como clientes

---

### orders (Ordens de Serviço)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador único |
| `account_id` | VARCHAR(14) FK | CNPJ/CPF da empresa |
| `customer_id` | VARCHAR(11) FK | CPF do cliente (ref: customers) |
| `operator_cpf` | VARCHAR(11) | CPF do operador que criou (ref: AvAdmin users) |
| `status` | VARCHAR(50) | Status da ordem |
| `created_at` | TIMESTAMP | Data de criação |

---

### sales (Vendas PDV)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador único |
| `account_id` | VARCHAR(14) FK | CNPJ/CPF da empresa |
| `customer_id` | VARCHAR(11) FK | CPF do cliente (ref: customers) |
| `operator_cpf` | VARCHAR(11) | CPF do vendedor (ref: AvAdmin users) |
| `total_amount` | DECIMAL | Valor total da venda |
| `created_at` | TIMESTAMP | Data de criação |

---

### products (Produtos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador único |
| `account_id` | VARCHAR(14) FK | CNPJ/CPF da empresa dona |
| `name` | VARCHAR(100) | Nome do produto |
| `description` | TEXT | Descrição |
| `price` | DECIMAL | Preço |
| `quantity` | INTEGER | Quantidade em estoque |
| `created_at` | TIMESTAMP | Data de criação |

**Nota:** Dados 100% locais, não sincronizados com AvAdmin

---

### devices (Dispositivos/Equipamentos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador único |
| `account_id` | VARCHAR(14) FK | CNPJ/CPF da empresa |
| `operator_cpf` | VARCHAR(11) | CPF do operador que registrou |
| `serial_number` | VARCHAR(100) | Número de série |
| `description` | TEXT | Descrição |
| `created_at` | TIMESTAMP | Data de criação |

---

## Fluxo de Sincronização - AxCellOS

### 1. Primeiro Acesso do Lojista/Distribuidor

```
┌──────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│AppPortal │────>│  AxCellOS  │────>│  AvAdmin   │────>│ Neon DB  │
│          │     │  Frontend  │     │  API       │     │          │
└──────────┘     └────────────┘     └────────────┘     └──────────┘
     │                 │                  │                  │
     │ Redirect com    │                  │                  │
     │ ?token=JWT      │                  │                  │
     │────────────────>│                  │                  │
     │                 │ validateToken    │                  │
     │                 │─────────────────>│                  │
     │                 │                  │ SELECT user,     │
     │                 │                  │ account,         │
     │                 │                  │ owner_cpf        │
     │                 │                  │─────────────────>│
     │                 │                  │<─────────────────│
     │                 │<─────────────────│                  │
     │                 │                  │                  │
     │                 │ ⚡ Validações:                      │
     │                 │ • client_type = 'cliente_final'?    │
     │                 │   → REJEITA! ❌                     │
     │                 │ • account_id IS NULL?              │
     │                 │   (Tem empresa vinculada?)          │
     │                 │                  │                  │
     │                 │ syncAccountToUsers()                │
     │                 │ INSERT INTO avelar_axcellos.users   │
     │                 │ (id, account_id, owner_cpf, ...)   │
     │                 │─────────────────────────────────────>
     │                 │                  │                  │
```

**O que acontece:**
1. AppPortal redireciona para `https://axcellos.avelarcompany.com.br?token=JWT`
2. AxCellOS extrai o token da URL e salva no localStorage/cookie
3. Backend valida token com AvAdmin API
4. **Validações de acesso:**
   - ✅ Se `client_type = 'lojista'` OU `client_type = 'distribuidor'` → **AUTORIZA**
   - ❌ Se `client_type = 'cliente_final'` → **REJEITA com erro 403**
5. **Sincronização (apenas se autorizado):**
   - Cria/atualiza registro na tabela `users` do AxCellOS
   - Inclui `owner_cpf` para rastreabilidade
6. Usuário lojista/distribuidor acessa o painel normalmente

---

### 2. Seleção de Cliente para Ordem/Venda

```
┌──────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│ Lojista  │────>│  AxCellOS  │────>│  AvAdmin   │────>│ Neon DB  │
│          │     │  Backend   │     │  API       │     │          │
└──────────┘     └────────────┘     └────────────┘     └──────────┘
     │                 │                  │                  │
     │ linkCustomer    │                  │                  │
     │ (CPF: 123...)   │                  │                  │
     │────────────────>│                  │                  │
     │                 │ SELECT customer  │                  │
     │                 │ FROM avelar_axcellos.customers      │
     │                 │─────────────────────────────────────>
     │                 │<─────────────────────────────────────│
     │                 │                  │                  │
     │                 │ (não encontrado) │                  │
     │                 │                  │                  │
     │                 │ getUserByCPF     │                  │
     │                 │ WHERE cpf=...    │                  │
     │                 │ AND client_type= │                  │
     │                 │ 'cliente_final'  │ ← FILTRO!        │
     │                 │ AND account_id   │                  │
     │                 │ IS NULL          │                  │
     │                 │─────────────────>│                  │
     │                 │                  │ SELECT user      │
     │                 │                  │─────────────────>│
     │                 │                  │<─────────────────│
     │                 │<─────────────────│                  │
     │                 │                  │                  │
     │                 │ syncCustomerFromAvAdmin()           │
     │                 │ INSERT INTO avelar_axcellos.customers
     │                 │─────────────────────────────────────>
     │                 │                  │                  │
     │<────────────────│ customer criado  │                  │
```

**O que acontece:**
1. Lojista busca cliente pelo CPF
2. AxCellOS verifica se já existe na tabela `customers` local
3. Se não existir, busca no AvAdmin com **filtros rigorosos**:
   - `client_type = 'cliente_final'` (apenas clientes puros)
   - `account_id IS NULL` (sem negócio próprio)
4. Valida que é um verdadeiro cliente final
5. Cria referência na tabela `customers` do AxCellOS
6. Futuras operações usam o registro local

---

## Endpoints - AxCellOS

### Middleware de Autenticação

```typescript
async createContext() {
  const token = validateToken(request);
  const user = await getAvAdminUser(token);
  
  // ⚡ CONTROLE DE ACESSO
  if (user.client_type === 'cliente_final') {
    throw new Error('Clientes finais não têm acesso');
  }
  
  // ⚡ SINCRONIZAÇÃO (apenas lojista/distribuidor)
  if (user.account_id) {
    await syncAccountToUsers(user);
  }
  
  return { user, db };
}
```

---

### Sincronização de Account

```typescript
// Sincroniza empresa (primeiro acesso de lojista)
async syncAccountToUsers(user: AvAdminUser): Promise<void> {
  const account = await avadmin.getAccount(user.account_id);
  
  await db.users.upsert({
    where: { id: account.id },
    update: {
      account_id: account.id,
      owner_cpf: account.owner_cpf,
      business_name: account.business_name,
      enabled_modules: account.enabled_modules,
      last_sync_at: new Date()
    },
    create: {
      id: account.id,
      account_id: account.id,
      owner_cpf: account.owner_cpf,
      business_name: account.business_name,
      enabled_modules: account.enabled_modules
    }
  });
}
```

---

### Sincronização de Cliente

```typescript
// Sincroniza cliente (quando usado pela primeira vez)
async syncCustomerFromAvAdmin(cpf: string, accountId: string): Promise<void> {
  // ⚡ FILTRO RIGOROSO: Apenas cliente_final sem account
  const customer = await avadmin.getUser(cpf);
  
  if (customer.client_type !== 'cliente_final' || customer.account_id !== null) {
    throw new Error('Usuário não é cliente final');
  }
  
  await db.customers.upsert({
    where: { id: cpf },
    update: {
      name: customer.full_name,
      whatsapp: customer.whatsapp,
      last_sync_at: new Date()
    },
    create: {
      id: cpf,
      account_id: accountId,
      name: customer.full_name,
      whatsapp: customer.whatsapp
    }
  });
}
```

---

## Cenários Práticos - AxCellOS

### Cenário A: João Silva - Lojista PF

**1. Cadastro (AppPortal):**
```
POST /register/cpf
{
  "cpf": "12345678901",
  "name": "João Silva",
  "whatsapp": "+5511999999999"
}
```

**2. Escolhe plano (AppPortal):**
```
Planos disponíveis:
├── "Lojista PF" (category: 'lojista') ← ESCOLHIDO
├── "Distribuidor" (category: 'distribuidor')
└── "Cliente Final" (category: 'cliente_final')
```

**3. Auto-detecção (AvAdmin):**
```sql
-- No endpoint POST /subscribe:
SELECT category FROM plans WHERE id = 'uuid-lojista';
-- category = 'lojista'

-- CREATE account (baseado em CPF):
INSERT INTO accounts (id, document, document_type, business_name, owner_cpf, is_individual)
VALUES ('12345678901', '12345678901', 'cpf', 'João Silva', '12345678901', true);

-- UPDATE user:
UPDATE users SET client_type = 'lojista', account_id = '12345678901', role = 'admin'
WHERE cpf = '12345678901';
```

**4. Primeiro login (AxCellOS):**
```
Token JWT validado → client_type = 'lojista' ✅
Autorizado! → Sincroniza na tabela users:

INSERT INTO avelar_axcellos.users
(id, account_id, owner_cpf, business_name, enabled_modules)
VALUES ('12345678901', '12345678901', '12345678901', 'João Silva', '[]');

João pode agora:
✅ Criar produtos
✅ Registrar vendas
✅ Adicionar clientes finais
```

---

### Cenário B: Maria Santos - Cliente Final

**1. Cadastro (AppPortal):**
```
POST /register/cpf
{
  "cpf": "98765432100",
  "name": "Maria Santos",
  "whatsapp": "+5511988888888"
}
```

**2. Escolhe plano (AppPortal):**
```
Planos disponíveis:
├── "Lojista PF" (category: 'lojista')
├── "Distribuidor" (category: 'distribuidor')
└── "Cliente Final" (category: 'cliente_final') ← ESCOLHIDO
```

**3. Auto-detecção (AvAdmin):**
```sql
-- No endpoint POST /subscribe:
SELECT category FROM plans WHERE id = 'uuid-cliente';
-- category = 'cliente_final'

-- NÃO cria account (é apenas cliente)

-- UPDATE user:
UPDATE users SET client_type = 'cliente_final', account_id = NULL, role = 'user'
WHERE cpf = '98765432100';
```

**4. Tenta fazer login (AxCellOS):**
```
Token JWT validado → client_type = 'cliente_final' ❌
ACESSO NEGADO! (403 Forbidden)

Maria não acessa AxCellOS!
Pode apenas ser vinculada como cliente por um lojista.
```

**5. Um lojista a vincula (AxCellOS):**
```sql
-- Lojista busca Maria pelo CPF:
GET /api/customers/98765432100

-- AxCellOS valida:
SELECT * FROM users WHERE cpf = '98765432100'
AND client_type = 'cliente_final' ✅
AND account_id IS NULL ✅

-- Sincroniza como cliente:
INSERT INTO avelar_axcellos.customers
(id, account_id, name, whatsapp)
VALUES ('98765432100', '12345678901', 'Maria Santos', '+5511988888888');

Maria agora pode ser usada em ordens/vendas!
```

---

### Cenário C: João Silva Abre CNPJ

**Fase 1: Com CPF (igual Cenário A)**
```sql
accounts:
├── id: 12345678901
├── document_type: 'cpf'
└── is_individual: true
```

**Fase 2: Abre CNPJ → Migração (não duplica!)**
```sql
-- AvAdmin (migração):
UPDATE accounts SET
  id = '12345678000199',
  document = '12345678000199',
  document_type = 'cnpj',
  is_individual = false,
  previous_document = '12345678901'
WHERE id = '12345678901';

-- Update user:
UPDATE users SET account_id = '12345678000199'
WHERE cpf = '12345678901';

-- AxCellOS (próximo login sincroniza):
UPDATE avelar_axcellos.users SET
  id = '12345678000199',
  account_id = '12345678000199'
WHERE id = '12345678901';

Resultado: 1 account (CNPJ) + histórico
❌ NÃO cria nova account
✅ Mantém previous_document = '12345678901'
```

---

## 🔄 Dados Sincronizados vs Locais

### AvAdmin (Fonte Principal)
- **Usuários** (users)
- **Contas/Empresas** (accounts)
- **Planos** (plans)
- **Papéis/Roles** (role assignments)

### AxCellOS (Sincronizado de AvAdmin + Dados Locais)
- **Sincronizado:** users (de AvAdmin), products (de estoque local)
- **Locais:** orders, sales, customers (clientes finais)
- **Filtro de Clientes:** `client_type = 'cliente_final'` AND `account_id IS NULL`

### StockTech (Sincronizado de AvAdmin + Dados Locais)
- **Sincronizado:** users (de AvAdmin.accounts - empresas/lojas)
- **Locais:** products (marketplace), transactions, orders, returns, seller_profiles

---

## 🌐 Referências entre Bancos

| Tabela | BD Original | Referencia | BD Destino | Campo |
|--------|------------|-----------|-----------|--------|
| users | AvAdmin | → | AxCellOS | cpf, account_id, owner_cpf |
| users | AvAdmin | → | StockTech | account_id, owner_cpf, business_name, whatsapp |
| accounts | AvAdmin | → | AxCellOS | id (CNPJ/CPF), owner_cpf |
| accounts | AvAdmin | → | StockTech | id (CNPJ/CPF), owner_cpf |
| customers | AxCellOS | ← | AvAdmin | (clientes finais apenas) |

---

## 🔐 Considerações de Performance e Segurança

### Performance

1. **Índices Multi-Tenancy**
   - `AvAdmin users`: índice em (account_id, cpf)
   - `AvAdmin accounts`: índice em owner_cpf
   - `AxCellOS users`: índice em account_id
   - `AxCellOS customers`: índice em (client_type, account_id)
   - `StockTech products`: índice em (accountId, createdAt)
   - `StockTech transactions`: índice em (accountId, date)

2. **Queries Comuns**
   ```sql
   -- AvAdmin: Listar contas de um lojista
   SELECT * FROM accounts WHERE owner_cpf = '123.456.789-00'
   
   -- AxCellOS: Listar usuários de uma conta
   SELECT * FROM users WHERE account_id = '14.123.456/0001-89'
   
   -- StockTech: Listar produtos de um lojista
   SELECT * FROM products WHERE accountId = '123.456.789-00'
   ```

3. **Paginação em Relatórios**
   - Sempre usar LIMIT + OFFSET ou cursor-based pagination
   - Evitar SELECT * em tabelas com muitas linhas

### Segurança

1. **RLS (Row Level Security) - AvAdmin (Neon)**
   - Usuários só veem contas onde `owner_cpf` = seu CPF
   - Código:
   ```sql
   CREATE POLICY "users_see_own_accounts" 
   ON accounts 
   FOR SELECT 
   USING (owner_cpf = current_setting('auth.cpf'));
   ```

2. **Application-Level Filtering - AxCellOS + StockTech**
   - Middleware valida `account_id` em todas as queries
   - Rejeita requests se `account_id` não bate com sessão
   - Exemplo:
   ```typescript
   const user = validateToken(req);
   const query = {
     account_id: user.account_id,  // Forçado pelo middleware
     ...restOfQuery
   };
   ```

3. **Validação de Client Type**
   - AxCellOS: `client_type = 'cliente_final'` → erro 403
   - StockTech: `client_type = 'cliente_final'` → erro 403
   - Apenas lojistas/distribuidores: ✅

4. **CPF Masking em Logs**
   - Nunca logar CPF completo
   - Logar últimos 4 dígitos: `***-00`
   - Exemplo: `User 123.456.789-00 → User ***-00`

---

## 📈 Diagrama Integrado: 3 Bancos Sincronizados

```
                    ┌──────────────────────────────────────────────┐
                    │           USER JOURNEY                       │
                    └──────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────────────┐     ┌───────────────────┐
│  AppPortal  │────>│   AvAdmin (Neon)    │     │  AxCellOS (BD)    │
│  (Cadastro) │     │   (Autenticação)    │────>│  (Vendas/PDV)     │
└─────────────┘     └─────────────────────┘     └───────────────────┘
                            │                            │
                            │ Sincroniza               │ Sincroniza
                            │ cpf, account_id,        │ customers
                            │ owner_cpf,              │ (clientes finais)
                            │ client_type             │
                            │                          │
                            ↓                          ↓
                    ┌─────────────────────┐     ┌───────────────────┐
                    │  Neon DB (AvAdmin)  │     │  StockTech (BD)   │
                    │  • accounts         │────>│  (Estoque/B2B)    │
                    │  • users            │     │                   │
                    │  • plans            │     │  Sincroniza:      │
                    │  • owner_cpf ← NEW  │     │  • users (full    │
                    └─────────────────────┘     │    sync accounts) │
                                                │  • client_type    │
                                                │    validation     │
                                                └───────────────────┘

════════════════════════════════════════════════════════════════════════

FLUXOS PRINCIPAIS:

1️⃣ CADASTRO & AUTO-DETECÇÃO (AppPortal → AvAdmin)
   User escolhe plano com category → System detecta tipo → 
   Cria account + assign client_type

2️⃣ PRIMEIRO ACESSO AXCELLOS (AvAdmin → AxCellOS)
   Lojista/Distribuidor faz login → Sincroniza user + account →
   Rejeita cliente_final (403)

3️⃣ CLIENTE FINAL SINCRONIZADO (AvAdmin → AxCellOS)
   Cliente final → Criado em AxCellOS.customers →
   Não pode fazer login (client_type = 'cliente_final')

4️⃣ PRIMEIRO ACESSO STOCKTECH (AvAdmin → StockTech)
   Lojista/Distribuidor faz login → Sincroniza users (full sync de accounts) →
   Pode criar produtos, fazer transações B2B →
   Rejeita cliente_final (403)

════════════════════════════════════════════════════════════════════════

DECISÕES-CHAVE POR TABELA:

┌──────────────────────────────────────────────────────────────────┐
│ AVADMIN (FONTE DE VERDADE)                                       │
├──────────────────────────────────────────────────────────────────┤
│ • Única fonte de autenticação                                    │
│ • CPF do owner em accounts.owner_cpf (novo)                      │
│ • Auto-detecção via plans.category                               │
│ • Nunca é sobrescrito por AxCellOS/StockTech                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ AXCELLOS (VENDAS + CLIENTES FINAIS)                              │
├──────────────────────────────────────────────────────────────────┤
│ • Sincroniza users (lojistas/distribuidores)                     │
│ • Sincroniza customers (APENAS clientes finais)                  │
│ • Rejeita cliente_final em middleware                            │
│ • Filtra customers: client_type='cliente_final' AND account_id   │
│ • Dados locais: products, orders, sales, devices                │
│ • Não sincroniza com StockTech                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ STOCKTECH (ESTOQUE + MARKETPLACE B2B)                            │
├──────────────────────────────────────────────────────────────────┤
│ • Cache local de users (apenas lojistas/distribuidores)          │
│ • Produtos marketplace owned by accountId                        │
│ • Transações B2B (buyerId, sellerId = CPFs)                      │
│ • Rejeita cliente_final em middleware                            │
│ • Nenhum cliente final tem acesso                                │
└──────────────────────────────────────────────────────────────────┘
```

---

# 📊 StockTech Database (Implementação)

## Visão Geral

StockTech é o **sistema de controle de estoque, gestão de inventário e marketplace** para lojistas e distribuidores. 

**Acesso:** ✅ Lojistas e Distribuidores | ❌ Clientes Finais

**Diferença de AxCellOS:**
- AxCellOS: Mistura **clientes finais + lojistas** (PDV + vendas + pedidos)
- **StockTech: APENAS lojistas e distribuidores** (estoque + marketplace + transações B2B)

## Arquitetura de Dados - StockTech

```
┌──────────────────────────────────────────────────────────────┐
│                   STOCKTECH (Database)                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────┐    ┌────────────────────────────┐ │
│  │  users (DE ACCOUNTS)  │    │      products              │ │
│  │───────────────────────│    │────────────────────────────│ │
│  │ id (CPF ou CNPJ)      │    │ id (serial)                │ │
│  │ owner_cpf (multi-ten) │←──→│ accountId → users.id       │ │
│  │ business_name         │    │ createdByUserId → AvAdmin  │ │
│  │ whatsapp, status...   │    │ code, name, price, qty     │ │
│  └───────────────────────┘    │ warrantyPeriod, condition  │ │
│                                └────────────────────────────┘ │
│                                                               │
│  ┌───────────────────────┐    ┌────────────────────────────┐ │
│  │   transactions        │    │       orders               │ │
│  │───────────────────────│    │────────────────────────────│ │
│  │ id, accountId         │    │ id, accountId              │ │
│  │ buyerId, sellerId     │    │ buyerAccountId, seller...  │ │
│  │ (AMBOS CPF/CNPJ)      │    │ buyerId, sellerId (CPF)    │ │
│  │ type: sale/purchase   │    │ items, status, payment     │ │
│  └───────────────────────┘    └────────────────────────────┘ │
│                                                               │
│  ┌───────────────────────┐    ┌────────────────────────────┐ │
│  │    productReturns     │    │   sellerProfiles           │ │
│  │───────────────────────│    │────────────────────────────│ │
│  │ id, accountId         │    │ accountId, userId          │ │
│  │ buyerId, sellerId     │    │ storeName, description     │ │
│  │ orderId, productId    │    │ rating, totalSales         │ │
│  │ status, warranty info │    │ followers, location        │ │
│  └───────────────────────┘    └────────────────────────────┘ │
│                                                               │
│  Outras tabelas:                                              │
│  • ratings, addresses, userPreferences, carts                │
│  • brands, productTypes, productParts, productConditions     │
│  • Todas com accountId para multi-tenancy                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 🔑 Premissas para StockTech

### 1. Apenas Lojistas e Distribuidores Acessam
- ❌ Clientes finais NÃO fazem login
- ✅ Lojistas (PF ou PJ) acessam
- ✅ Distribuidores acessam
- 🔐 Validação no middleware: rejeita se `client_type = 'cliente_final'`

### 2. Tabela `users` Sincroniza de AvAdmin.accounts
- ✅ Puxa TODAS as informações de `AvAdmin.accounts`
- ✅ Representa a empresa/loja do lojista (não a pessoa)
- ✅ Sincroniza no primeiro login e a cada acesso
- ✅ Campos: id, business_name, owner_cpf, whatsapp, status, etc.

### 3. Multi-Tenancy Lojista-Só
- `accountId` sempre = CPF ou CNPJ do **proprietário da loja**
- Não mistura clientes finais nas tabelas (diferença com AxCellOS)
- Filtro: APENAS `client_type = 'lojista'` ou `'distribuidor'`

### 4. Transações B2B
- `buyerId` e `sellerId` = CPFs de lojistas/distribuidores (nunca clientes)
- `buyerAccountId` e `sellerAccountId` = CNPJs/CPFs das contas
- Marketplace: comprador (lojista 1) ↔ vendedor (lojista 2)

---

## Tabelas - StockTech

### users (Sincroniza TUDO de AvAdmin accounts)

**⚡ IMPORTANTE: Tabela `users` puxa TODAS as informações de `AvAdmin.accounts`**

| Campo | Tipo | Origem | Descrição |
|-------|------|--------|-----------|
| `id` | VARCHAR(14) PK | accounts.id | CPF ou CNPJ (pode ser um ou outro) |
| `document_type` | ENUM | accounts.document_type | 'cpf' ou 'cnpj' |
| `document` | VARCHAR(14) | accounts.document | Documento sem formatação |
| `business_name` | VARCHAR(255) | accounts.business_name | Nome da empresa/loja |
| `owner_cpf` | VARCHAR(11) | accounts.owner_cpf | CPF do dono (para multi-tenancy) |
| `is_individual` | BOOLEAN | accounts.is_individual | É pessoa física? |
| `whatsapp` | VARCHAR(20) | accounts.whatsapp | WhatsApp da loja |
| `status` | VARCHAR(50) | accounts.status | Ativo/Inativo |
| `enabled_modules` | JSON | accounts.enabled_modules | Módulos habilitados |
| `previous_document` | VARCHAR(14) | accounts.previous_document | Doc anterior (CPF→CNPJ) |
| `plan_id` | UUID | accounts.plan_id | Plano contratado |
| `client_type` | ENUM | users.client_type | 'lojista' / 'distribuidor' / 'cliente_final' |
| `createdAt` | TIMESTAMP | accounts.createdAt | Data de criação |
| `updatedAt` | TIMESTAMP | accounts.updatedAt | Data de atualização |

**Lógica de Sincronização (Tenta PJ → CPF Lojista → Nome):**

```typescript
async function syncUserFromAvAdminAccount(token: string) {
  const user = await validateTokenWithAvAdmin(token);
  
  // ⚡ VALIDAÇÃO 1: Rejeitar cliente_final
  if (user.client_type === 'cliente_final') {
    throw new Error('403: Clientes finais não acessam StockTech');
  }
  
  // ⚡ VALIDAÇÃO 2: Ser lojista ou distribuidor
  if (!['lojista', 'distribuidor'].includes(user.client_type)) {
    throw new Error('403: Acesso restrito a lojistas e distribuidores');
  }
  
  // ⚡ LÓGICA DE NOME:
  // 1. Se tem business_name → usa business_name
  // 2. Se não tiver → usa full_name do usuário AvAdmin
  // 4. Se não tiver → usa full_name do usuário AvAdmin
  
  let displayName = user.account_business_name;
  
  if (!displayName) {
    displayName = user.full_name;
  }
  
  // ⚡ SINCRONIZAÇÃO: Puxa TUDO de AvAdmin.accounts
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, user.account_id)
  });
  
  if (!existingUser) {
    await db.insert(users).values({
      id: user.account_id,                          // ← CPF ou CNPJ
      document_type: user.account_document_type,   // ← 'cpf' ou 'cnpj'
      document: user.account_document,              // ← Sem formatação
      business_name: user.account_business_name,   // ← De accounts
      owner_cpf: user.account_owner_cpf,           // ← De accounts
      is_individual: user.is_individual,           // ← De accounts
      whatsapp: user.account_whatsapp,             // ← De accounts
      status: user.account_status,                 // ← De accounts
      enabled_modules: user.enabled_modules,       // ← De accounts (JSON)
      previous_document: user.previous_document,   // ← De accounts
      plan_id: user.plan_id,                       // ← De accounts
      client_type: user.client_type,               // ← Do users AvAdmin
      createdAt: user.account_created_at,
      updatedAt: new Date(),
    });
  } else {
    // Atualiza campos de accounts
    await db.update(users)
      .set({
        business_name: user.account_business_name,
        owner_cpf: user.account_owner_cpf,
        is_individual: user.is_individual,
        whatsapp: user.account_whatsapp,
        status: user.account_status,
        enabled_modules: user.enabled_modules,
        plan_id: user.plan_id,
        client_type: user.client_type,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.account_id));
  }
  
  return displayName;
}
```

**Sincronização Automática:**
- ✅ No primeiro login do lojista/distribuidor
- ✅ Toda vez que faz login (valida se dados mudaram)
- ✅ TUDO vem de AvAdmin (nunca sobrescreve)
- ✅ Se trocar de CPF para CNPJ: `previous_document` rastreia

**DIFERENÇA COM AXCELLOS:**
- **Ambos** (AxCellOS + StockTech) sincronizam de `AvAdmin.accounts`
- **Ambos** usam `id` = CPF ou CNPJ
- **Ambos** puxam `owner_cpf` para multi-tenancy
- **Diferença:** Ambos rejeitam login de cliente_final (erro 403). No AxCellOS, clientes finais são sincronizados na tabela `customers` (não em `users`) quando um lojista os vincula a uma ordem/venda.

---

### products (Produtos de Lojista)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL PK | Identificador único |
| `accountId` | VARCHAR(14) FK | CPF/CNPJ do dono (isolamento multi-tenancy) |
| `createdByUserId` | VARCHAR(11) | CPF de quem criou (AvAdmin users.cpf) |
| `code` | VARCHAR(50) UNIQUE | Código do produto |
| `name` | VARCHAR(255) | Nome |
| `brand` | VARCHAR(100) | Marca |
| `model` | VARCHAR(100) | Modelo |
| `productType` | VARCHAR(100) | Tipo (eletrônicos, celulares, etc) |
| `category` | VARCHAR(100) | Categoria |
| `description` | TEXT | Descrição |
| `price` | DECIMAL | Preço |
| `quantity` | INTEGER | Quantidade em estoque |
| `minQuantity` | INTEGER | Quantidade mínima |
| `condition` | ENUM | NEW / USED / REFURBISHED / ORIGINAL_RETIRADA |
| `images` | TEXT | JSON array de URLs |
| `warrantyPeriod` | ENUM | NONE / DAYS_7 / DAYS_30 / DAYS_90 / MONTHS_6 |
| `defectiveQuantity` | INTEGER | Quantidade com defeito |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Acesso:**
- ✅ Lojista/distribuidor pode criar/editar seus próprios produtos
- ❌ Não pode editar produtos de outro lojista
- Filtro: `WHERE accountId = <seu_account_id>`

---

### transactions (Transações B2B)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL PK | Identificador único |
| `accountId` | VARCHAR(14) | Conta principal (isolamento) |
| `buyerId` | VARCHAR(11) | CPF do comprador (lojista) |
| `sellerId` | VARCHAR(11) | CPF do vendedor (lojista) |
| `transactionCode` | VARCHAR(50) UNIQUE | Código único |
| `type` | ENUM | sale / purchase |
| `productId` | INTEGER FK | Produto |
| `productName` | VARCHAR(255) | Cache do nome |
| `counterparty` | VARCHAR(255) | Nome da contrapartida |
| `counterpartyRole` | ENUM | buyer / seller |
| `amount` | DECIMAL | Valor total |
| `quantity` | INTEGER | Quantidade |
| `status` | ENUM | completed / pending / cancelled |
| `date` | TIMESTAMP | Data da transação |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Diferença com AxCellOS:**
- AxCellOS: transações são **sales (cliente finais)**
- **StockTech: transações são B2B** (lojista → lojista, distribuidor → lojista)

---

### orders (Pedidos Marketplace)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL PK | Identificador único |
| `accountId` | VARCHAR(14) | Conta principal (isolamento) |
| `buyerAccountId` | VARCHAR(14) | Conta do comprador (lojista 1) |
| `sellerAccountId` | VARCHAR(14) | Conta do vendedor (lojista 2) |
| `buyerId` | VARCHAR(11) | CPF do comprador |
| `sellerId` | VARCHAR(11) | CPF do vendedor |
| `orderCode` | VARCHAR(20) UNIQUE | Código do pedido |
| `parentOrderCode` | VARCHAR(20) | Agrupamento para comprador |
| `status` | ENUM | pending_payment / paid / processing / shipped / delivered / awaiting_exchange / exchange_completed / cancelled |
| `subtotal` | DECIMAL | Subtotal |
| `freight` | DECIMAL | Frete |
| `total` | DECIMAL | Total |
| `addressId` | INTEGER FK | Endereço de entrega |
| `items` | TEXT | JSON array dos itens |
| `paymentNotes` | TEXT | Instruções de pagamento |
| `paymentConfirmedAt` | TIMESTAMP | Quando pagamento foi confirmado |
| `paymentConfirmedBy` | VARCHAR(11) | Quem confirmou (CPF vendedor) |
| `trackingCode` | VARCHAR(50) | Rastreamento |
| `trackingCarrier` | VARCHAR(100) | Transportadora |
| `notes` | TEXT | Observações |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

---

### productReturns (Devoluções/Trocas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL PK | Identificador único |
| `accountId` | VARCHAR(14) | Conta principal |
| `buyerId` | VARCHAR(11) | CPF do comprador |
| `sellerId` | VARCHAR(11) | CPF do vendedor |
| `orderId` | INTEGER FK | Pedido relacionado |
| `productId` | INTEGER FK | Produto |
| `transactionId` | INTEGER FK | Transação |
| `returnCode` | VARCHAR(20) UNIQUE | Código da devolução |
| `reason` | TEXT | Motivo |
| `quantity` | INTEGER | Quantidade devolvida |
| `status` | ENUM | requested / approved_replacement / approved_refund / rejected / completed |
| `sellerDecision` | VARCHAR(50) | replacement / refund |
| `sellerNotes` | TEXT | Notas do vendedor |
| `approvedAt` | TIMESTAMP | Data aprovação |
| `approvedBy` | VARCHAR(11) | Quem aprovou (CPF) |
| `completedAt` | TIMESTAMP | Data conclusão |
| `rejectedAt` | TIMESTAMP | Data rejeição |
| `rejectionReason` | TEXT | Motivo rejeição |
| `isWithinWarranty` | BOOLEAN | Dentro da garantia |
| `warrantyExpiresAt` | TIMESTAMP | Vencimento garantia |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

---

### sellerProfiles (Perfil de Lojista)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL PK | Identificador único |
| `accountId` | VARCHAR(14) FK | CPF/CNPJ do lojista |
| `userId` | VARCHAR(11) FK | CPF do usuário |
| `storeName` | VARCHAR(255) | Nome da loja |
| `phone` | VARCHAR(20) | Telefone |
| `city` | VARCHAR(100) | Cidade |
| `state` | VARCHAR(2) | Estado |
| `profilePhoto` | TEXT | URL foto perfil |
| `coverPhoto` | TEXT | URL foto capa |
| `description` | TEXT | Descrição loja |
| `rating` | DECIMAL(3,2) | Rating (0-5 stars) |
| `totalSales` | INTEGER | Total vendas |
| `totalSalesAmount` | DECIMAL | Valor total vendido |
| `totalProducts` | INTEGER | Total produtos |
| `totalReviews` | INTEGER | Total reviews |
| `followers` | INTEGER | Seguidores |
| `responseTime` | INTEGER | Tempo resposta (minutos) |
| `street` | VARCHAR(255) | Rua |
| `number` | VARCHAR(20) | Número |
| `neighborhood` | VARCHAR(100) | Bairro |
| `zipCode` | VARCHAR(20) | CEP |
| `latitude` | DECIMAL | Latitude |
| `longitude` | DECIMAL | Longitude |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

---

## Fluxo de Sincronização - StockTech

### 1. Primeiro Login do Lojista/Distribuidor

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│StockTech │────>│   AvAdmin    │────>│  Neon DB │────>│ StockTech│
│Frontend  │     │   API        │     │          │     │ Database │
└──────────┘     └──────────────┘     └──────────┘     └──────────┘
     │                  │                    │                │
     │ Redirect com     │                    │                │
     │ ?token=JWT       │                    │                │
     │────────────────> │                    │                │
     │                  │ validateToken      │                │
     │                  │──────────────────> │                │
     │                  │                    │ SELECT user,   │
     │                  │                    │ account        │
     │                  │                    │───────────────>│
     │                  │                    │<───────────────│
     │                  │<──────────────────>│                │
     │                  │                    │                │
     │                  │ ⚡ Validações:     │                │
     │                  │ • client_type ≠   │                │
     │                  │   'cliente_final'? │                │
     │                  │ • account_id ≠    │                │
     │                  │   NULL?           │                │
     │                  │                    │                │
     │                  │ syncUserCache()    │                │
     │                  │ INSERT INTO        │                │
     │                  │ stocktech.users    │                │
     │                  │────────────────────────────────────>
     │                  │                    │                │
```

**O que acontece:**
1. StockTech redireciona para `https://stocktech.avelarcompany.com.br?token=JWT`
2. Frontend valida token com AvAdmin API
3. **Validações:**
   - ✅ Se `client_type = 'lojista'` OU `'distribuidor'` → **AUTORIZA**
   - ❌ Se `client_type = 'cliente_final'` → **REJEITA com erro 403**
4. **Sincronização (apenas se autorizado):**
   - Cria cache na tabela `users` do StockTech
   - Copia: CPF, nome, email, account_id
5. Lojista acessa o painel do StockTech normalmente

---

### 2. Criar/Editar Produto

```
Lojista clica "Novo Produto" no StockTech
   ↓
Frontend valida que é lojista (token JWT)
   ↓
Backend INSERT INTO products:
   - accountId = <seu_account_id (CPF/CNPJ)>
   - createdByUserId = <seu_cpf>
   - Demais dados (code, name, price, etc.)
   ↓
Produto criado e visível apenas para essa loja
(Filtro: WHERE accountId = <seu_account_id>)
```

---

### 3. Transação B2B (Lojista 1 → Lojista 2)

```
Lojista 1 compra produto de Lojista 2
   ↓
INSERT INTO transactions:
   - accountId = <lojista1_account_id>
   - buyerId = <lojista1_cpf>
   - sellerId = <lojista2_cpf>
   - type = 'purchase'
   - productId, amount, quantity...
   ↓
Sincroniza com AxCellOS (se aplicável)
   ↓
Relatórios de estoque atualizados
```

---

## Controle de Acesso - StockTech

| Ação | Lojista | Distribuidor | Cliente |
|------|---------|--------------|---------|
| **Fazer login** | ✅ | ✅ | ❌ |
| **Ver produtos próprios** | ✅ | ✅ | ❌ |
| **Criar produtos** | ✅ | ✅ | ❌ |
| **Editar produtos próprios** | ✅ | ✅ | ❌ |
| **Ver transações próprias** | ✅ | ✅ | ❌ |
| **Criar pedidos B2B** | ✅ | ✅ | ❌ |
| **Ver pedidos como comprador** | ✅ | ✅ | ❌ |
| **Ver perfil de loja** | ✅ | ✅ | ❌ |

---

## Endpoints - StockTech

### Middleware de Autenticação

```typescript
async createContext() {
  const token = validateToken(request);
  const user = await getAvAdminUser(token);
  
  // ⚡ CONTROLE DE ACESSO (diferente de AxCellOS)
  if (user.client_type === 'cliente_final') {
    throw new Error('Clientes finais não têm acesso ao StockTech');
  }
  
  // ⚡ SINCRONIZAÇÃO (apenas lojista/distribuidor)
  if (user.account_id) {
    await syncUserCacheFromAvAdmin(user);
  }
  
  return { user, db };
}
```

---

## Diferenças: AxCellOS vs StockTech

| Aspecto | AxCellOS | StockTech |
|---------|----------|-----------|
| **Usuários** | Lojistas + Clientes Finais | APENAS Lojistas/Distribuidores |
| **Tabela users** | Cache de CONTAS (empresas) | Cache de PESSOAS |
| **Transações** | Sales (PDV) | B2B (marketplace) |
| **Produtos** | Locais da loja | Catálogo marketplace |
| **Clientes** | Clientes finais sincronizados | Não tem clientes, tem fornecedores |
| **Middleware** | Rejeita cliente_final | Rejeita cliente_final |
| **Marketplace** | ❌ Não | ✅ Sim (B2B) |

---

## Checklist de Implementação - StockTech

### Fase 1: Cache de Usuários (do AvAdmin)
- [ ] Atualizar schema `users` com campos sincronizados
- [ ] Criar migration para adicionar `accountId` a `users`
- [ ] Implementar função `syncUserCacheFromAvAdmin(user)`
- [ ] Testar sincronização no primeiro login

### Fase 2: Validação de Acesso
- [ ] Implementar middleware que valida `client_type`
- [ ] Rejeitar com 403 se `client_type = 'cliente_final'`
- [ ] Adicionar logs de acesso negado
- [ ] Testar com cliente final (deve ser bloqueado)

### Fase 3: Produtos com Multi-Tenancy
- [ ] Validar `accountId` em todos os endpoints de products
- [ ] Garantir índice em `(accountId, createdAt)`
- [ ] Implementar filtro: `WHERE accountId = <seu_account_id>`
- [ ] Testar: Lojista 1 não pode editar produtos de Lojista 2

### Fase 4: Transações B2B
- [ ] Validar que `buyerId` e `sellerId` são CPFs
- [ ] Criar índice em `(accountId, date)`
- [ ] Testar: Lojista 1 comprando de Lojista 2

### Fase 5: Devoluções e Warranty
- [ ] Validar warranty info ao criar productReturns
- [ ] Implementar fluxo de aprovação do vendedor
- [ ] Testar: Cliente dentro/fora da garantia

### Fase 6: Seller Profiles
- [ ] Criar profile para lojista no primeiro login
- [ ] Sincronizar dados de AvAdmin (nome da empresa, etc.)
- [ ] Implementar edição de perfil (storeName, description, etc.)
- [ ] Testar: Mostrar perfil público no marketplace

### Fase 7: Testes Finais
- [ ] Teste E2E: Lojista faz login → vê seus produtos
- [ ] Teste E2E: Cliente final tenta logar → bloqueado
- [ ] Teste de Performance: 1000 produtos por lojista
- [ ] Teste de Segurança: SQL injection, autorização

---

## Resumo das Mudanças no Schema

### Estrutura Corrigida: users Puxa TUDO de AvAdmin.accounts

**⚡ TANTO AxCellOS QUANTO StockTech puxam a MESMA estrutura de `AvAdmin.accounts`**

```typescript
// NOVO Schema para AMBOS (AxCellOS e StockTech)
export const users = pgTable("users", {
  // Identidade (de accounts.id)
  id: varchar("id", { length: 14 }).primaryKey(),           // CPF ou CNPJ
  document_type: pgEnum("document_type", ["cpf", "cnpj"]),  // cpf ou cnpj
  document: varchar("document", { length: 14 }),            // Sem formatação
  
  // Informações da Empresa (de accounts)
  business_name: varchar("business_name", { length: 255 }),
  
  // Multi-Tenancy (de accounts)
  owner_cpf: varchar("owner_cpf", { length: 11 }).notNull(), // Para filtrar
  is_individual: boolean("is_individual"),
  
  // Contato (de accounts)
  whatsapp: varchar("whatsapp", { length: 20 }),
  
  // Status (de accounts)
  status: varchar("status", { length: 50 }),
  enabled_modules: text("enabled_modules"), // JSON
  
  // Histórico (de accounts)
  previous_document: varchar("previous_document", { length: 14 }), // CPF→CNPJ
  plan_id: uuid("plan_id"),
  
  // Controle (de users AvAdmin + system)
  client_type: pgEnum("client_type", ["lojista", "distribuidor", "cliente_final"]),
  last_sync_at: timestamp("last_sync_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Índices para multi-tenancy
index: {
  ownerCpfIdx: index("users_owner_cpf_idx").on(table.owner_cpf),
  documentIdx: index("users_document_idx").on(table.document),
}
```

**O que Muda:**

| Campo | Antes | Depois |
|-------|-------|--------|
| PK | openId (UUID) | id = account_id (CPF ou CNPJ) |
| Identificação | name, email | business_name, document_type |
| Multi-Tenancy | accountId (FK separada) | **id já é account + owner_cpf adicional** |
| Origem | Parcial (users AvAdmin) | **TUDO de accounts AvAdmin** |
| Email | ✅ Tinha | ❌ Removido |

**Sincronização (MESMO código para AxCellOS e StockTech):**

```typescript
async function syncUserFromAvAdminAccount(accountId: string, token: string) {
  const avadminUser = await getAvAdminUser(token);
  const avadminAccount = await getAvAdminAccount(accountId);
  
  // ⚡ VALIDAÇÕES
  if (avadminUser.client_type === 'cliente_final' && systemName === 'StockTech') {
    throw new Error('403: Cliente final não acessa StockTech');
  }
  if (avadminUser.client_type === 'cliente_final' && systemName === 'AxCellOS') {
    // Sincroniza em CUSTOMERS, não em USERS
    return;
  }
  
  // ⚡ LÓGICA DE NOME PARA EXIBIÇÃO:
  // 1. Se business_name existe → usa
  // 2. Se não → usa nome pessoal do user AvAdmin
  
  const displayName = avadminAccount.business_name 
    || avadminUser.full_name;
  
  // ⚡ SINCRONIZAÇÃO: Puxa TUDO de accounts
  const existing = await db.query.users.findFirst({
    where: eq(users.id, accountId)
  });
  
  if (!existing) {
    await db.insert(users).values({
      id: avadminAccount.id,                          // ← id da account
      document_type: avadminAccount.document_type,   // ← 'cpf' ou 'cnpj'
      document: avadminAccount.document,              // ← Sem formatação
      business_name: avadminAccount.business_name,   // ← Nome da empresa
      owner_cpf: avadminAccount.owner_cpf,           // ← Para multi-tenancy
      is_individual: avadminAccount.is_individual,
      whatsapp: avadminAccount.whatsapp,
      status: avadminAccount.status,
      enabled_modules: JSON.stringify(avadminAccount.enabled_modules),
      previous_document: avadminAccount.previous_document,
      plan_id: avadminAccount.plan_id,
      client_type: avadminUser.client_type,
      last_sync_at: new Date(),
      created_at: avadminAccount.created_at,
      updated_at: new Date(),
    });
  } else {
    // Atualiza TUDO de accounts
    await db.update(users)
      .set({
        document_type: avadminAccount.document_type,
        document: avadminAccount.document,
        business_name: avadminAccount.business_name,
        owner_cpf: avadminAccount.owner_cpf,
        is_individual: avadminAccount.is_individual,
        whatsapp: avadminAccount.whatsapp,
        status: avadminAccount.status,
        enabled_modules: JSON.stringify(avadminAccount.enabled_modules),
        previous_document: avadminAccount.previous_document,
        plan_id: avadminAccount.plan_id,
        client_type: avadminUser.client_type,
        last_sync_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(users.id, accountId));
  }
  
  return displayName;
}
```

**Nome Exibido (Prioridade):**
1️⃣ `business_name` (nome da loja/empresa)
2️⃣ Fallback: `full_name` (nome pessoal do usuário AvAdmin)

---

## Exemplo: Lojista João Silva (CPF como PJ)

### AvAdmin
```
users:
  cpf: '123.456.789-00'
  full_name: 'João Silva'
  account_id: '123.456.789-00'  (CPF como ID de account)
  client_type: 'lojista'
  role: 'admin'

accounts:
  id: '123.456.789-00'                    ← PK = CPF
  document_type: 'cpf'
  document: '12345678900'                 ← Sem formatação
  is_individual: true
  owner_cpf: '123.456.789-00'
  business_name: 'João Silva - Distribuidor de Eletrônicos'
  whatsapp: '85987654321'
  status: 'active'
  enabled_modules: ['inventory', 'marketplace']
```

### AxCellOS users (Sincronizado)
```
users:
  id: '123.456.789-00'                    ← PK = CPF
  document_type: 'cpf'
  document: '12345678900'
  business_name: 'João Silva - Distribuidor de Eletrônicos'
  owner_cpf: '123.456.789-00'             ← Para multi-tenancy
  is_individual: true
  whatsapp: '85987654321'
  status: 'active'
  client_type: 'lojista'
  display_name: 'João Silva - Distribuidor de Eletrônicos' ← business_name
  last_sync_at: 2026-02-07T10:00:00Z
```

### StockTech users (Sincronizado - MESMA estrutura)
```
users:
  id: '123.456.789-00'                    ← PK = CPF
  document_type: 'cpf'
  document: '12345678900'
  business_name: 'João Silva - Distribuidor de Eletrônicos'
  owner_cpf: '123.456.789-00'             ← Para multi-tenancy
  is_individual: true
  whatsapp: '85987654321'
  status: 'active'
  client_type: 'lojista'
  display_name: 'João Silva - Distribuidor de Eletrônicos' ← business_name
  last_sync_at: 2026-02-07T10:00:00Z
```

---

## Exemplo: Lojista Abrindo CNPJ (CPF → CNPJ)

### AvAdmin - Antes
```
accounts:
  id: '123.456.789-00'        ← CPF como ID
  document_type: 'cpf'
  is_individual: true
  owner_cpf: '123.456.789-00'
  business_name: 'João Silva - Distribuidor'
```

### AvAdmin - Depois (João abre CNPJ)
```
accounts:
  id: '14.123.456/0001-89'            ← NOVO CNPJ
  document_type: 'cnpj'               ← Atualizado
  is_individual: false                ← Atualizado
  owner_cpf: '123.456.789-00'         ← MANTÉM (rastreabilidade)
  previous_document: '123.456.789-00' ← REGISTRA CPF antigo
  business_name: 'João Silva CNPJ Ltda'
```

### AxCellOS + StockTech - Atualizam automaticamente
```
users:
  id: '14.123.456/0001-89'            ← CNPJ atualizado
  document_type: 'cnpj'
  previous_document: '123.456.789-00' ← Rastreia migração
  owner_cpf: '123.456.789-00'         ← Mesmo dono
```

### ⚠️ IMPORTANTE: Dados Locais na Migração CPF→CNPJ

**O que acontece com orders, products, sales, etc.?**

Os dados locais em AxCellOS e StockTech **NÃO são afetados** pela migração porque:

1. **Multi-tenancy usa `owner_cpf`** - Todas as tabelas locais (orders, products, sales, devices) usam `owner_cpf` para filtrar por dono, NÃO o `id` da tabela users
2. **`owner_cpf` NUNCA muda** - Mesmo quando o lojista abre CNPJ, o `owner_cpf` permanece o mesmo CPF do dono
3. **Continuidade garantida** - Todos os dados históricos continuam acessíveis porque o filtro `WHERE owner_cpf = '123.456.789-00'` continua funcionando

```
Antes (CPF): orders WHERE owner_cpf = '123.456.789-00' → ✅ 50 ordens
Depois (CNPJ): orders WHERE owner_cpf = '123.456.789-00' → ✅ Mesmas 50 ordens
```

---

# 📋 Dados Sincronizados vs Locais

## Tabela Geral de Sincronização

| Dado | Banco de Origem | Banco de Destino | Sincronização | Depende de |
|------|-----------------|------------------|---------------|-----------|
| **users (lojistas)** | AvAdmin.accounts | AxCellOS + StockTech | Ao fazer login | client_type ≠ cliente_final |
| **customers (clientes)** | AvAdmin.users | AxCellOS | Quando vinculado | client_type='cliente_final' E account_id=NULL |
| **plans (planos)** | AvAdmin | - | Não sincroniza | - |
| **owner_cpf (multi-ten)** | AvAdmin.accounts | AxCellOS + StockTech | Junto com users | - |
| **products (produtos)** | AxCellOS | - | LOCAL (não sincroniza) | owner_cpf |
| **orders (ordens)** | AxCellOS | - | LOCAL (não sincroniza) | owner_cpf |
| **sales (vendas)** | AxCellOS | - | LOCAL (não sincroniza) | owner_cpf |
| **products (estoque)** | StockTech | - | LOCAL (não sincroniza) | owner_cpf |
| **transactions (B2B)** | StockTech | - | LOCAL (não sincroniza) | owner_cpf |

---

# 🔗 Referências entre Bancos

| Campo | Origem | Referencia | Observação |
|-------|--------|-----------|-----------|
| `users.id` | AvAdmin | CPF (sempre) | Chave única de pessoa |
| `users.account_id` | AvAdmin | `accounts.id` (CPF ou CNPJ) | NULL se cliente_final |
| `accounts.owner_cpf` | AvAdmin | `users.cpf` do AvAdmin | CPF do proprietário |
| `accounts.plan_id` | AvAdmin | `plans.id` | Plano contratado |
| `avelar_axcellos.users.id` | AxCellOS | `accounts.id` (CPF ou CNPJ) | Sincronizado do AvAdmin |
| `avelar_axcellos.users.owner_cpf` | AxCellOS | AvAdmin users.cpf | Rastreabilidade |
| `customers.id` | AxCellOS | AvAdmin users.cpf | CPF do cliente final |
| `orders.operator_cpf` | AxCellOS | AvAdmin users.cpf | CPF de quem criou |
| `sales.operator_cpf` | AxCellOS | AvAdmin users.cpf | CPF do vendedor |
| `plans.category` | AvAdmin | - | Define auto-detecção |

---

# ⚙️ Considerações de Performance

## AvAdmin

1. **Índices recomendados:**
   ```sql
   CREATE INDEX idx_users_cpf ON users(cpf);
   CREATE INDEX idx_users_account_id ON users(account_id);
   CREATE INDEX idx_users_client_type ON users(client_type);
   CREATE INDEX idx_accounts_owner_cpf ON accounts(owner_cpf);
   CREATE INDEX idx_accounts_document_type ON accounts(document_type);
   CREATE INDEX idx_plans_category ON plans(category);
   ```

2. **Cache:** client_type pode ser cacheado no JWT

---

## AxCellOS

1. **Índices recomendados:**
   ```sql
   CREATE INDEX idx_users_owner_cpf ON avelar_axcellos.users(owner_cpf);
   CREATE INDEX idx_customers_account_id ON avelar_axcellos.customers(account_id);
   CREATE INDEX idx_customers_id ON avelar_axcellos.customers(id);
   CREATE INDEX idx_orders_account_id ON avelar_axcellos.orders(account_id);
   CREATE INDEX idx_sales_account_id ON avelar_axcellos.sales(account_id);
   ```

2. **Cache Local:** Dados de clientes são cacheados localmente

3. **Sincronização Assíncrona:** Executa em background para não bloquear requisições

4. **last_sync_at:** Permite implementar políticas de refresh

---

# 📝 Versioning

*Documento criado em: 2026-02-07*
*Última atualização: 2026-02-07*
*Versão: 3.2*

**Changelog:**
- v3.2: **Corrigido: users puxa TUDO de AvAdmin.accounts**
  - ✅ Removido email como identificador
  - ✅ Removido sincronização de transações com AxCellOS
  - ✅ **AMBOS (AxCellOS + StockTech) sincronizam de accounts**
  - ✅ Estrutura idêntica para users em ambos sistemas
  - ✅ Lógica de nome: business_name → full_name (fallback)
  - ✅ Tenta CNPJ primeiro, se não tiver verifica CPF lojista
  - ✅ Rastreamento de migração CPF → CNPJ via `previous_document`
  - ✅ Multi-tenancy via `owner_cpf` integrado em users
  - ✅ Exemplos completos com João Silva (CPF e CPF→CNPJ)
- v3.1: **StockTech - Análise Completa da Estrutura**
  - ✅ Análise detalhada do schema existente do StockTech
  - ✅ Mapeamento de tabelas e seus campos
  - ✅ Adaptações necessárias para integração com AvAdmin
  - ✅ Cache local de users (sincronização de AvAdmin)
  - ✅ Validação de acesso (apenas lojistas/distribuidores)
  - ✅ Multi-tenancy por `accountId` (CPF/CNPJ)
  - ✅ Transações B2B (lojista ↔ lojista)
  - ✅ Controle de acesso, endpoints, examples
  - ✅ Checklist de implementação por fase
  - ✅ Diagrama integrado de 3 bancos sincronizados
- v3.0: **Reorganização por bancos de dados**
  - ✅ Seção AvAdmin Database (Neon DB)
  - ✅ Seção AxCellOS Database (avelar_axcellos)
  - ✅ Seção StockTech Database (placeholder → implementação)
  - ✅ Tabela consolidada de sincronização
  - ✅ Referências entre bancos documentadas
- v2.1: Implementação completa com respostas finais
- v2.0: Implementação de auto-detecção de tipo baseada em categoria do plano
- v1.1: Adicionado campo `owner_cpf` para multi-tenancy por proprietário
- v1.0: Versão inicial
