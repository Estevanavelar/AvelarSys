# AppPortal - Tipos de Cliente e Fluxos de Login

**Data:** 16 de Janeiro de 2026  
**Status:** Fluxo atualizado e implementado (redirecionamento + dashboard)

---

## 📋 Visão Geral

O AppPortal possui **2 tipos de cliente** e **2 fluxos de login** distintos, com rotas e características específicas para cada um.

---

## 1️⃣ TIPO DE CLIENTE: PESSOA FÍSICA (CPF)

### Características Gerais
- ✅ Usa **CPF** como identificador
- ✅ Dados pessoais obrigatórios:
  - Nome completo
  - CPF (formatado: XXX.XXX.XXX-XX)
  - Email
  - WhatsApp (formatado: (XX) XXXXX-XXXX)
  - Data de nascimento
- ✅ Dados de endereço (opcional/preenchimento automático via ViaCEP):
  - CEP (XXXXX-XXX)
  - Rua/Logradouro
  - Número
  - Complemento
  - Bairro
  - Cidade
  - Estado (UF)
- ✅ Autenticação: Senha (mínimo 6 caracteres)
- ✅ Total de passos: **3**

### Fluxo de Registro
```
/register/select-type 
  ↓ (Clica em "Pessoa Física")
/register/cpf 
  ├── Passo 1: Dados Pessoais (nome, CPF, email, WhatsApp, data nascimento)
  ├── Passo 2: Endereço (CEP, rua, número, bairro, cidade, estado)
  ├── Passo 3: Senha (criar e confirmar senha)
  ↓
/register/services
  ↓
/register/plan
  ↓
/register/success
```

### Dados Salvos
- Local: `sessionStorage` → `registerData`
- Formato: `{ type: 'cpf', fullName, cpf, email, whatsapp, birthDate, cep, street, number, complement, neighborhood, city, state, password }`

### Tipos de Cliente Possíveis
- `cliente` - Cliente final/consumidor
- `lojista` - Lojista autônomo/pessoa física vendedor

---

## 2️⃣ TIPO DE CLIENTE: EMPRESA (CNPJ)

### Características Gerais
- ✅ Usa **CNPJ** como identificador
- ✅ Dados da empresa obrigatórios:
  - Razão social
  - CNPJ (formatado: XX.XXX.XXX/XXXX-XX)
- ✅ Dados do responsável/admin obrigatórios:
  - Nome completo
  - CPF (formatado: XXX.XXX.XXX-XX)
  - Email
  - WhatsApp (formatado: (XX) XXXXX-XXXX)
  - Data de nascimento (opcional)
- ✅ Dados de endereço da empresa:
  - CEP (XXXXX-XXX)
  - Rua/Logradouro
  - Número
  - Complemento
  - Bairro
  - Cidade
  - Estado (UF)
- ✅ Autenticação: Senha (mínimo 6 caracteres)
- ✅ Total de passos: **4**

### Fluxo de Registro
```
/register/select-type 
  ↓ (Clica em "Empresa")
/register/cnpj 
  ├── Passo 1: Dados da Empresa (razão social, CNPJ)
  ├── Passo 2: Dados do Responsável (nome, CPF, email, WhatsApp, data nascimento)
  ├── Passo 3: Endereço (CEP, rua, número, bairro, cidade, estado)
  ├── Passo 4: Senha (criar e confirmar senha)
  ↓
/register/services
  ↓
/register/plan
  ↓
/register/success
```

### Dados Salvos
- Local: `sessionStorage` → `registerData`
- Formato: `{ type: 'cnpj', companyName, cnpj, adminName, adminCpf, adminEmail, adminWhatsapp, adminBirthDate, cep, street, number, complement, neighborhood, city, state, password }`

### Tipos de Cliente Possíveis
- `lojista` - Empresa vendedora/lojista
- `distribuidor` - Empresa distribuidora
- `admin` - Admin da empresa

---

## 3️⃣ FLUXO DE LOGIN - USUÁRIOS COMUNS (Admin, Lojista, Distribuidor, Cliente)

### Comportamento Esperado

**Entrada:** `/login`

**Passos:**
1. Usuário faz login com CPF/CNPJ + senha
2. Backend valida e retorna:
   - `access_token` (JWT)
   - `user` (UserInfo com role, enabled_modules, etc.)
3. Frontend salva no `localStorage`:
   - `avelar_token` (JWT)
   - `avelar_user` (JSON stringified)
4. **Frontend redireciona para `/dashboard`**
   - Dashboard com abas: Módulos, Pagamento/Faturamento, Funcionários (empresas)

### Dashboard (/dashboard) - Estrutura

**Abas disponíveis:**

1. **📦 Aba de Módulos**
   - Lista os módulos contratados pelo usuário/empresa
   - Cada módulo é um card com:
     - Ícone do módulo
     - Nome do módulo
     - Descrição
     - Botão "Acessar" (redireciona para subdomínio)
   - Layout similar a `/select-module` mas filtra por acesso

2. **💳 Aba de Pagamento/Faturamento** (para todos)
   - Plano atual (nome, valor, data de renovação)
   - Histórico de pagamentos
   - Próxima data de cobrança
   - Botão "Gerenciar Plano" (redireciona para página de upgrade/downgrade)
   - Nota: Cobrado mensalmente conforme plano escolhido

3. **👥 Aba de Funcionários** (apenas para empresas - `admin`/`lojista`/`distribuidor`)
   - Lista de funcionários com acesso aos módulos
   - Gerenciar permissões por funcionário
   - Adicionar/remover funcionários
   - Definir quais módulos cada funcionário pode acessar

### Controle de Acesso por Tipo

| Tipo | Modules | Dashboard | Redirecionamento |
|------|---------|-----------|-----------------|
| `cliente` | Shop | ✅ Sim | Login → `/dashboard` |
| `lojista` (CPF) | StockTech, Naldo | ✅ Sim | Login → `/dashboard` |
| `admin` (CNPJ) | StockTech, Naldo | ✅ Sim + Funcionários | Login → `/dashboard` |
| `distribuidor` (CNPJ) | StockTech, Naldo | ✅ Sim + Funcionários | Login → `/dashboard` |

---

## 4️⃣ FLUXO DE LOGIN - SUPER ADMIN

### Comportamento

**Entrada:** `/login`

**Passos:**
1. Super Admin faz login com CPF + senha
2. Backend valida e retorna token
3. Frontend determina redirecionamento:
   - **Super Admin** → `/select-module` (tela de seleção)
   - Mostra todos os módulos: AvAdmin, StockTech, Shop, Naldo

### Tela de Seleção de Módulos (/select-module) - Super Admin

**Componentes:**
- Header com logo e dados do super admin (nome + role)
- Botão logout
- Greeting: "Olá, [FirstName]!"
- Grid com TODOS os módulos
- Cada card mostra:
  - Ícone do módulo (emoji)
  - Nome do módulo
  - Descrição
  - Botão "Acessar"

**Seção especial:**
- "Todos os Módulos do Sistema"
- Mostra status (✓ Ativo / ○ Inativo) de cada módulo
- Visível apenas para super_admin

### 🔑 Diferença Crucial

- **`admin`** = **Dono da EMPRESA** (cadastro CNPJ) - Administrador da conta corporativa
  - Criado ao registrar uma empresa
  - Tem acesso aos módulos contratados pela empresa: **StockTech, Naldo**
  - ⚠️ **NÃO tem acesso ao AvAdmin** (módulo exclusivo do super_admin)

- **`super_admin`** = **Dono do SAS/SISTEMA** (Avelar Company) - Administrador da plataforma inteira
  - Você (criador do sistema)
  - Acesso total a **TODOS os módulos**: AvAdmin, StockTech, Shop, Naldo
  - AvAdmin é **exclusivo para super_admin** gerenciar toda a plataforma

### Regras Implementadas

- **Super Admin** → `/select-module`
  - Vê todos os módulos: AvAdmin, StockTech, Shop, Naldo
  - AvAdmin exclusivo do super_admin

- **Admin / Lojista / Distribuidor / Cliente** → `/dashboard`
  - Vê apenas módulos contratados
  - AvAdmin **não aparece** para admin

### Módulos para Cada Role

| Role | Quem É | Modules Acessíveis | Redirecionamento |
|------|--------|-------------------|------------------|
| `super_admin` | Dono do Sistema | **Todos** (AvAdmin ✅, StockTech, Shop, Naldo) | `/select-module` |
| `admin` | Dono da Empresa | StockTech, Naldo (**SEM AvAdmin** ❌) | `/dashboard` |
| `user` | Cliente/Lojista | Baseado no plano contratado | `/dashboard` |

### Implementação no Código (Resumo)

1. **Redirecionamento (`src/lib/redirect.ts`)**
   - Super Admin → `/select-module`
   - Outros → `/dashboard`
   - AvAdmin bloqueado para admin

2. **Select Module**
   - Acesso permitido somente para `super_admin`
   - Demais roles são redirecionados para `/dashboard`

3. **Dashboard**
   - Criado com 3 abas: Módulos, Faturamento, Funcionários (para empresas)

---

## 📊 TABELA RESUMIDA - TIPOS DE CLIENTE E ACESSO

| Cliente | Doc | Módulos | Role | Quem É | Redirecionamento |
|---------|-----|---------|------|---------|-----------------|
| Pessoa Física (Consumidor) | CPF | Shop | `user`/`cliente` | Consumidor final | `/dashboard` |
| Pessoa Física (Lojista) | CPF | StockTech, Naldo | `user`/`lojista` | Vendedor autônomo | `/dashboard` |
| Empresa (Lojista) | CNPJ | StockTech, Naldo | `admin`/`lojista` | Dono da empresa | `/dashboard` |
| Empresa (Distribuidor) | CNPJ | StockTech, Naldo | `admin`/`distribuidor` | Dono da empresa | `/dashboard` |
| Empresa (Admin) | CNPJ | StockTech, Naldo (**SEM AvAdmin** ❌) | `admin` | **Dono da Empresa (CNPJ)** | `/dashboard` |
| Super Admin | CPF | **Todos + AvAdmin** ✅ | `super_admin` | **Dono do SAS/Sistema (Avelar Company)** | `/select-module` |

---

## 📁 Estrutura de Arquivos Relevantes

```
/home/avelarsys/AvelarSys/AppPortal/src/app/
├── login/
│   └── page.tsx                 # Login form
├── register/
│   ├── page.tsx                 # Redirect to select-type
│   ├── select-type/page.tsx     # Escolher CPF ou CNPJ
│   ├── cpf/page.tsx             # Registro pessoa física
│   ├── cnpj/page.tsx            # Registro empresa
│   ├── services/page.tsx         # Seleção de serviços
│   ├── plan/page.tsx             # Seleção de plano
│   └── success/page.tsx          # Confirmação
├── select-module/page.tsx        # Seleção de módulos (somente super_admin)
├── dashboard/page.tsx            # Dashboard (implementado)
└── page.tsx                      # Home -> redireciona para login/select-module

/home/avelarsys/AvelarSys/AppPortal/src/lib/
└── redirect.ts                   # Lógica de redirecionamento
```

---

## 🔐 Dados do Usuário (UserInfo)

```typescript
interface UserInfo {
  id: string                      // UUID
  full_name: string               // Nome completo
  cpf: string                     // CPF (sem formatação)
  role: string                    // 'super_admin' | 'admin' | 'user'
  account_id?: string             // UUID da empresa (null para pessoa física)
  client_type?: string            // 'cliente' | 'lojista' | 'distribuidor'
  enabled_modules: string[]       // ['AvAdmin', 'StockTech', 'Shop', 'Naldo']
  whatsapp_verified: boolean      // Se WhatsApp foi verificado
}
```

---

### 🔄 Fluxo Completo de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. NOVO USUÁRIO                                            │
├─────────────────────────────────────────────────────────────┤
│ /register/select-type                                       │
│   ├─ Pessoa Física → /register/cpf (3 passos)             │
│   └─ Empresa → /register/cnpj (4 passos)                  │
│        ↓                                                     │
│ /register/services (escolher StockTech, Naldo, Shop)      │
│        ↓                                                     │
│ /register/plan (escolher plano por módulo)                │
│        ↓                                                     │
│ /register/success (confirmação)                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. LOGIN - SUPER ADMIN                                      │
├─────────────────────────────────────────────────────────────┤
│ /login (CPF + senha)                                        │
│        ↓ [Valida no backend]                                │
│ localStorage: avelar_token + avelar_user                   │
│        ↓                                                     │
│ /select-module (todos os 4 módulos disponíveis)           │
│        ↓                                                     │
│ Clica em módulo → Redireciona para subdomínio             │
│ (token passa em cookie ou query param)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. LOGIN - ADMIN, LOJISTA, DISTRIBUIDOR, CLIENTE           │
├─────────────────────────────────────────────────────────────┤
│ /login (CPF/CNPJ + senha)                                   │
│        ↓ [Valida no backend]                                │
│ localStorage: avelar_token + avelar_user                   │
│        ↓                                                     │
│ /dashboard (portal unificado)                              │
│   ├─ Aba 1: Módulos (cards dos módulos contratados)      │
│   ├─ Aba 2: Pagamento/Faturamento (renovação mensal)     │
│   └─ Aba 3: Funcionários (apenas empresas)                │
│        ↓                                                     │
│ Clica em módulo → Redireciona para subdomínio             │
│ (token passa em cookie ou query param)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ O que Foi Implementado

1. ✅ Sistema de registro bifurcado (CPF/CNPJ)
2. ✅ Passos progressivos com validação
3. ✅ Auto-preenchimento de endereço via ViaCEP
4. ✅ Controle de acesso por tipo de cliente
5. ✅ Cross-domain authentication com cookies
6. ✅ `/select-module` exclusivo para super_admin
7. ✅ `/dashboard` como home para admin/lojista/distribuidor/cliente
8. ✅ Redirecionamento ajustado em `src/lib/redirect.ts`

---

## ⏳ Pendências de Implementação

1. **Integração com Sistema de Planos (dados reais)**
   - Carregar plano atual do backend
   - Exibir valor e data de renovação
   - Histórico de pagamentos real
   - Botão para upgrade/downgrade

2. **Gestão de Funcionários (dados reais)**
   - CRUD de funcionários
   - Permissões por módulo
   - Integração com backend

---

## 📝 Próximos Passos

1. **Integrar sistema de planos no dashboard**
   - Exibir plano atual (backend)
   - Data de renovação
   - Histórico de pagamentos

2. **Implementar gestão de funcionários** (para empresas)
   - CRUD + permissões por módulo

3. **Refinar redirecionamento cross-domain**
   - Garantir token/usuário na troca de subdomínios
