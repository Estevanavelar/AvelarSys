# 🔗 Integração com AvAdmin - AxCellOS

## Visão Geral

O sistema AxCellOS integra com o AvAdmin para:
1. **Autenticação de Lojistas**: Login via AppPortal + validação de token
2. **Busca de Clientes**: Usa a API interna existente `/api/internal/user/{id}`

**IMPORTANTE**: Clientes finais são usuários cadastrados no AvAdmin. O AxCellOS apenas referencia pelo ID (CPF).

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│   AxCellOS      │  ← Sistema de gestão (PDV + OS)
└────────┬────────┘
         │
         │ Busca cliente por ID
         ▼
┌─────────────────┐
│   AvAdmin API   │  ← GET /api/internal/user/{id}
└────────┬────────┘
         │
         │ Dados do usuário
         ▼
┌─────────────────┐
│   Neon (DB)     │  ← Banco do AvAdmin
└─────────────────┘
```

---

## 📋 Dados de Cliente

### Campos que o AxCellOS utiliza:
- **id** - CPF do cliente (string, 11 dígitos)
- **full_name** - Nome completo do cliente
- **cpf** - CPF formatado
- **whatsapp** - Número do WhatsApp

### Campos disponíveis mas NÃO utilizados:
- ❌ role (sempre será "user" para clientes)
- ❌ account_id (clientes finais não têm conta)
- ❌ enabled_modules
- ❌ Endereço (disponível, mas não usado no AxCellOS)

---

## 🔄 Fluxos de Integração

### 1. Buscar Cliente por ID (CPF)

Usa o endpoint **existente** da API interna do AvAdmin.

**Requisição:**
```http
GET /api/internal/user/{cpf}
```

**Resposta:**
```json
{
  "id": "12345678900",
  "cpf": "12345678900",
  "full_name": "João Silva",
  "whatsapp": "+5511987654321",
  "role": "user",
  "account_id": null,
  "is_active": true,
  "whatsapp_verified": true,
  "client_type": "cliente",
  "enabled_modules": [],
  "zip_code": "01310100",
  "address_street": "Av. Paulista",
  "address_city": "São Paulo",
  "address_state": "SP",
  "address_number": "1000",
  "address_neighborhood": "Bela Vista",
  "complement": "Apto 101",
  "reference_point": null,
  "store_name": null
}
```

**O que o AxCellOS faz:**
- Armazena o `id` (CPF) como `customerId` nas tabelas `serviceOrders` ou `sales`
- Exibe `full_name` e `whatsapp` na interface
- Dados são buscados em tempo real quando necessário

---

### 2. Buscar Cliente por CPF (Pesquisa)

**NOTA:** Não existe endpoint de busca por CPF na API interna. 

**Soluções:**
1. O lojista digita o CPF completo e busca diretamente por ID
2. Criar cache local de clientes já utilizados (para autocomplete)

**Fluxo recomendado:**
1. Lojista digita CPF do cliente
2. Sistema chama `GET /api/internal/user/{cpf}`
3. Se encontrado: exibe dados e permite continuar
4. Se não encontrado: exibe erro "Cliente não cadastrado"

---

### 3. Cadastrar Novo Cliente

**IMPORTANTE:** O AxCellOS **NÃO cadastra clientes**.

Clientes devem ser cadastrados pelo próprio cliente via:
- AppPortal (`/register/cpf`)
- Ou pelo lojista no painel AvAdmin

O AxCellOS apenas **referencia** clientes existentes.

---

## 📊 Armazenamento de Referência

O AxCellOS armazena apenas o **ID do cliente (CPF)** como referência:

### `serviceOrders`
```sql
customerId VARCHAR(14) NOT NULL  -- CPF do cliente (referência externa)
accountId VARCHAR(14) NOT NULL   -- CNPJ do lojista (multi-tenancy)
```

### `sales`
```sql
customerId VARCHAR(14)  -- CPF do cliente (opcional)
accountId VARCHAR(14) NOT NULL  -- CNPJ do lojista (multi-tenancy)
```

### `devices`
```sql
customerId VARCHAR(14) NOT NULL  -- CPF do cliente
accountId VARCHAR(14) NOT NULL   -- CNPJ do lojista
```

---

## 🔌 Endpoints Utilizados no AvAdmin

O AxCellOS usa os seguintes endpoints **existentes** da API interna:

### 1. Validar Token (Autenticação)
```
POST /api/internal/validate-token
Body: { token: string }
Response: { valid: bool, user: UserData, account: AccountData }
```

### 2. Buscar Usuário/Cliente por ID
```
GET /api/internal/user/{user_id}
Response: UserData
```

### 3. Verificar Acesso ao Módulo
```
POST /api/internal/check-module-access
Body: { account_id: string, user_id: string, module: "AxCellOS" }
Response: { hasAccess: bool, module: string, reason?: string }
```

---

## 🔐 Autenticação

### Para requisições à API interna:
- Requisições são feitas **server-to-server** (backend do AxCellOS → AvAdmin)
- Não precisa de token Bearer (API interna não é exposta publicamente)
- Configurar firewall para permitir apenas IPs internos

### Para autenticação de lojistas:
- Token JWT obtido via AppPortal
- Validado via `POST /api/internal/validate-token`
- Sessão gerenciada via cookies httpOnly

---

## 📝 Exemplo de Uso no Backend

```typescript
import { avAdminClient } from './lib/avadmin';

// Buscar cliente por CPF
async function getCustomer(cpf: string) {
  try {
    const user = await avAdminClient.getUserById(cpf);
    
    // Mapear para formato simplificado
    return {
      id: user.id,
      name: user.full_name,
      cpf: user.cpf,
      whatsapp: user.whatsapp,
    };
  } catch (error) {
    if (error.status === 404) {
      throw new Error('Cliente não encontrado');
    }
    throw error;
  }
}

// Criar ordem de serviço
async function createServiceOrder(data: CreateOrderInput, ctx: Context) {
  // Verificar se cliente existe
  const customer = await getCustomer(data.customerId);
  
  // Criar ordem com referência ao cliente e conta do lojista
  return await db.insert(serviceOrders).values({
    customerId: customer.id,      // CPF do cliente
    accountId: ctx.user.account_id, // CNPJ do lojista (multi-tenancy)
    deviceBrand: data.deviceBrand,
    deviceModel: data.deviceModel,
    defect: data.defect,
    // ... outros campos
  });
}
```

---

## 🏢 Multi-tenancy

O sistema é **multi-tenant** - cada lojista tem seus próprios dados isolados.

### Como funciona:
1. Lojista faz login via AppPortal
2. Token contém `account_id` (CNPJ do lojista)
3. Todas as queries filtram por `accountId`
4. Lojista só vê seus próprios dados

### Campos de isolamento:
```sql
-- Em todas as tabelas de dados:
accountId VARCHAR(14) NOT NULL  -- CNPJ do lojista

-- Índice para performance:
CREATE INDEX idx_account ON tabela(accountId);
```

---

## ⚠️ Observações Importantes

1. **ID do Cliente = CPF**: 
   - O ID do cliente no AvAdmin é o próprio CPF (string de 11 dígitos)
   - O campo `customerId` deve ser `VARCHAR(14)` (não integer!)

2. **Clientes são EXTERNOS**: 
   - Cadastro de clientes é feito no AppPortal ou AvAdmin
   - AxCellOS apenas referencia pelo ID
   - Não há tabela `customers` local

3. **Multi-tenancy obrigatório**: 
   - Todas as queries DEVEM filtrar por `accountId`
   - Nunca permitir acesso a dados de outros lojistas

4. **API Interna**: 
   - Endpoints `/api/internal/*` não são públicos
   - Apenas comunicação server-to-server

5. **Cliente não encontrado**: 
   - Se CPF não existe no AvAdmin, exibir erro
   - Orientar o lojista a cadastrar o cliente via AvAdmin

---

**Última atualização**: Corrigido para usar endpoints existentes `/api/internal/user/{id}`
