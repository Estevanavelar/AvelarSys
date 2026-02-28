# 📊 Documentação do Schema - AxCellOS

## Visão Geral

Schema PostgreSQL completo criado para o sistema AxCellOS, focado **EXCLUSIVAMENTE** em:
- **PDV** (Ponto de Venda)
- **Ordem de Serviço**
- **Estoque** (Produtos)
- **Configurações**

**Banco de Dados**: Supabase Self-hosted  
**Schema**: `avelar_axcellos`  
**Dialeto**: PostgreSQL

---

## ⚠️ PONTOS IMPORTANTES

1. **Clientes são EXTERNOS**: 
   - Gerenciados no AvAdmin (banco Neon separado)
   - Busca via `/api/internal/user/{cpf}`
   - **NÃO existe tabela `customers` local**
   - Referenciamos apenas pelo `customerId` (CPF - VARCHAR 14)

2. **Multi-tenancy (OBRIGATÓRIO)**:
   - Todas as tabelas de dados têm `accountId` (CNPJ do lojista)
   - **TODAS as queries DEVEM filtrar por `accountId`**
   - Isola dados entre diferentes lojistas

3. **Status de Ordem Simplificado**:
   - `Aguardando` → `Pronto` → `Pago`
   - Apenas 3 estados conforme frontend atual

4. **WhatsApp**: Não será implementado por enquanto

---

## 📋 Tabelas

### 1. `devices` - Aparelhos dos Clientes

Armazena aparelhos vinculados aos clientes para histórico de reparos.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `accountId` | varchar(14), NOT NULL | **CNPJ do lojista (multi-tenancy)** |
| `customerId` | varchar(14), NOT NULL | **CPF do cliente (referência externa)** |
| `brand` | varchar(100), NOT NULL | Marca do aparelho |
| `model` | varchar(100), NOT NULL | Modelo do aparelho |
| `serialNumber` | varchar(100) | Número de série (opcional) |
| `notes` | text | Observações sobre o aparelho |
| `createdAt` | timestamp | Data de cadastro |
| `updatedAt` | timestamp | Data de atualização |

**Índices**:
- `idx_devices_account` em `accountId`
- `idx_devices_customer` em `customerId`

---

### 2. `serviceOrders` - Ordens de Serviço

Armazena ordens de serviço de reparo de dispositivos.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `accountId` | varchar(14), NOT NULL | **CNPJ do lojista (multi-tenancy)** |
| `orderNumber` | varchar(50), UNIQUE | Número da OS (ex: OS-20260122001) |
| `customerId` | varchar(14), NOT NULL | **CPF do cliente (referência externa)** |
| `deviceId` | integer, FK → devices | Aparelho vinculado (opcional) |
| `deviceBrand` | varchar(100), NOT NULL | Marca do dispositivo |
| `deviceModel` | varchar(100), NOT NULL | Modelo do dispositivo |
| `defect` | text, NOT NULL | Defeito relatado |
| `status` | varchar(50), NOT NULL | **Status: Aguardando, Pronto, Pago** |
| `estimatedCost` | numeric(10,2) | Custo estimado |
| `totalValue` | numeric(10,2) | Valor total do serviço |
| `notes` | text | Observações internas |
| `warrantyUntil` | timestamp | Garantia válida até |
| `emoji` | varchar(10) | Emoji identificador (padrão: 📱) |
| `paymentInfo` | jsonb | Informações de pagamento |
| `createdAt` | timestamp | Data de criação |
| `updatedAt` | timestamp | Data de atualização |

**Status possíveis**:
- `Aguardando` - Ordem recebida, aguardando reparo
- `Pronto` - Reparo concluído, aguardando pagamento/entrega
- `Pago` - Pago e entregue (estado final)

**Índices**:
- `idx_service_orders_account` em `accountId`
- `idx_service_orders_customer` em `customerId`
- `idx_service_orders_status` em `status`

---

### 3. `serviceOrderHistory` - Histórico de Ordens

Rastreia todas as mudanças de status das ordens de serviço.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `serviceOrderId` | integer, FK → serviceOrders | Ordem relacionada |
| `previousStatus` | varchar(50) | Status anterior |
| `newStatus` | varchar(50), NOT NULL | Novo status |
| `notes` | text | Observações da mudança |
| `changedBy` | varchar(14) | **CPF do usuário que alterou** |
| `createdAt` | timestamp | Data da mudança |

**Nota**: `changedBy` é CPF do lojista/funcionário (não do cliente)

---

### 4. `products` - Produtos (Estoque)

Armazena produtos para venda no PDV e controle de estoque.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `accountId` | varchar(14), NOT NULL | **CNPJ do lojista (multi-tenancy)** |
| `name` | varchar(255), NOT NULL | Nome do produto |
| `description` | text | Descrição |
| `sku` | varchar(100) | Código SKU |
| `price` | numeric(10,2), NOT NULL | Preço de venda |
| `cost` | numeric(10,2) | Preço de custo |
| `quantity` | integer, NOT NULL | Quantidade em estoque |
| `minStock` | integer | Estoque mínimo (alerta) |
| `imageUrl` | varchar(512) | URL da imagem no S3 |
| `imageKey` | varchar(512) | Chave do arquivo no S3 |
| `emoji` | varchar(10) | Emoji quando não há imagem |
| `category` | varchar(100) | Categoria do produto |
| `active` | boolean | Produto ativo |
| `createdAt` | timestamp | Data de criação |
| `updatedAt` | timestamp | Data de atualização |

**Índices**:
- `idx_products_account` em `accountId`
- `idx_products_sku` em `(accountId, sku)` - SKU único por lojista

---

### 5. `sales` - Vendas (PDV)

Armazena vendas realizadas no PDV.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `accountId` | varchar(14), NOT NULL | **CNPJ do lojista (multi-tenancy)** |
| `saleNumber` | varchar(50), UNIQUE | Número da venda |
| `customerId` | varchar(14) | **CPF do cliente (opcional)** |
| `totalAmount` | numeric(10,2), NOT NULL | Valor total da venda |
| `paymentMethod` | varchar(20), NOT NULL | Método: cash, credit, debit, pix |
| `installments` | integer | Número de parcelas |
| `feeAmount` | numeric(10,2) | Taxa da maquininha |
| `feePercent` | numeric(5,2) | Percentual da taxa |
| `netValue` | numeric(10,2) | Valor líquido |
| `status` | varchar(20), NOT NULL | Status: pending, completed, cancelled |
| `notes` | text | Observações |
| `createdAt` | timestamp | Data da venda |
| `updatedAt` | timestamp | Data de atualização |

**Índices**:
- `idx_sales_account` em `accountId`
- `idx_sales_customer` em `customerId`

---

### 6. `saleItems` - Itens de Venda

Armazena os produtos de cada venda.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `saleId` | integer, FK → sales | Venda relacionada |
| `productId` | integer, FK → products | Produto vendido |
| `quantity` | integer, NOT NULL | Quantidade |
| `unitPrice` | numeric(10,2), NOT NULL | Preço unitário |
| `totalPrice` | numeric(10,2), NOT NULL | Preço total |
| `createdAt` | timestamp | Data de criação |

---

### 7. `settings` - Configurações

Armazena configurações do lojista.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | serial, PK | ID único |
| `accountId` | varchar(14), NOT NULL | **CNPJ do lojista (multi-tenancy)** |
| `key` | varchar(100), NOT NULL | Chave da configuração |
| `value` | jsonb, NOT NULL | Valor (JSON) |
| `description` | text | Descrição |
| `createdAt` | timestamp | Data de criação |
| `updatedAt` | timestamp | Data de atualização |

**Índice único**: `(accountId, key)` - cada lojista tem suas próprias configurações

---

## 🔗 Relações Entre Tabelas

```
┌─────────────┐
│  AvAdmin    │ ← Clientes (externos)
│  (Neon DB)  │
└──────┬──────┘
       │ customerId (CPF)
       ▼
┌─────────────────────────────────────────────────────┐
│                    AxCellOS                         │
│                (Supabase - avelar_axcellos)         │
│                                                     │
│   devices ──(1:N)──► serviceOrders ──(1:N)──► history   │
│      │                                              │
│      └── accountId (CNPJ) - multi-tenancy           │
│                                                     │
│   products ──(1:N)──► saleItems ◄──(N:1)── sales    │
│      │                                              │
│      └── accountId (CNPJ) - multi-tenancy           │
│                                                     │
│   settings (por accountId)                          │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Multi-tenancy

### Como funciona:
1. Lojista faz login → recebe token JWT com `account_id` (CNPJ)
2. Middleware extrai `accountId` do token
3. **TODAS** as queries filtram por `accountId`
4. Lojista só vê seus próprios dados

### Exemplo de query:
```typescript
// CORRETO - filtra por accountId
const orders = await db
  .select()
  .from(serviceOrders)
  .where(eq(serviceOrders.accountId, ctx.user.account_id));

// ERRADO - nunca fazer isso!
const orders = await db.select().from(serviceOrders);
```

---

## 🔄 Migração Necessária

O schema atual precisa ser atualizado para:

1. **Alterar tipo de `customerId`**:
   - De: `integer`
   - Para: `varchar(14)` (CPF)

2. **Adicionar `accountId` em todas as tabelas**:
   - `devices.accountId` (varchar 14, NOT NULL)
   - `serviceOrders.accountId` (varchar 14, NOT NULL)
   - `products.accountId` (varchar 14, NOT NULL)
   - `sales.accountId` (varchar 14, NOT NULL)
   - `settings.accountId` (varchar 14, NOT NULL)

3. **Alterar `changedBy` em `serviceOrderHistory`**:
   - De: `integer`
   - Para: `varchar(14)` (CPF do usuário)

---

## 🚀 Próximos Passos

1. [ ] Atualizar `drizzle/schema.ts` com as correções
2. [ ] Gerar migração: `npx drizzle-kit generate:pg`
3. [ ] Aplicar migração no Supabase
4. [ ] Criar índices de performance
5. [ ] Implementar middleware de multi-tenancy no backend

---

**Última atualização**: Corrigido para multi-tenancy (accountId) e customerId como VARCHAR (CPF)
