# 🔍 Relatório de Revisão - AxCellOS

## Resumo

Após análise completa de todos os documentos, arquivos e planos, identifiquei **erros críticos**, **inconsistências** e **gaps** que precisam ser resolvidos antes da implementação.

---

## 🔴 ERROS CRÍTICOS

### 1. Tipo de dados do `customerId` incompatível

**Problema:**
- **Schema AxCellOS** (`drizzle/schema.ts`): usa `integer("customerId")`
- **AvAdmin** (`user.py`): O ID do usuário é `String(11)` (CPF como PK)

**Impacto:** O `customerId` armazenado no AxCellOS não vai corresponder ao ID real do usuário no AvAdmin.

**Solução:** Alterar o tipo de `customerId` de `integer` para `varchar(14)` (para suportar tanto CPF 11 dígitos quanto CNPJ 14 dígitos):

```typescript
// ANTES (incorreto)
customerId: integer("customerId").notNull(),

// DEPOIS (correto)
customerId: varchar("customerId", { length: 14 }).notNull(),
```

**Arquivos afetados:**
- `drizzle/schema.ts` - tabelas `devices`, `serviceOrders`, `sales`

---

### 2. Endpoints de clientes NÃO existem no AvAdmin

**Problema:**
O documento `AVADMIN_INTEGRATION.md` assume que existem estes endpoints:
- `GET /api/customers/{id}`
- `GET /api/customers/search?cpf={cpf}`
- `POST /api/customers`

**Realidade:** O AvAdmin (`internal_api.py`) NÃO tem esses endpoints. Só tem:
- `/api/internal/validate-token`
- `/api/internal/user/{user_id}`
- `/api/internal/account/{account_id}`
- `/api/internal/check-module-access`

**Impacto:** Não será possível buscar/cadastrar clientes conforme documentado.

**Soluções possíveis:**
1. **Opção A:** Criar os endpoints de clientes no AvAdmin
2. **Opção B:** Criar tabela `customers` local no AxCellOS (contraria a documentação atual)
3. **Opção C:** Usar a tabela `users` do AvAdmin para buscar clientes (via `/api/internal/user/{user_id}`)

**Recomendação:** Opção C - usar endpoints existentes do AvAdmin para buscar usuários como clientes.

---

### 3. Falta de Multi-tenancy (Isolamento de dados)

**Problema:**
O sistema é SaaS para vários lojistas, mas as tabelas NÃO têm `accountId` para separar dados.

**Impacto:** Um lojista pode ver/modificar dados de outro lojista.

**Solução:** Adicionar `accountId` em TODAS as tabelas de dados:

```typescript
// Adicionar em: devices, serviceOrders, products, sales, settings
accountId: varchar("accountId", { length: 14 }).notNull(), // CNPJ da conta
```

**Arquivos afetados:**
- `drizzle/schema.ts` - todas as tabelas
- Backend - todos os queries precisam filtrar por `accountId`

---

## 🟠 INCONSISTÊNCIAS

### 4. Status da Ordem de Serviço não batem

**Schema (`drizzle/schema.ts`):**
```
"Recebido", "Em Reparo", "Pronto", "Entregue", "Pago"
```

**Frontend (`OrdersContext.tsx`):**
```typescript
status: 'Aguardando' | 'Pronto' | 'Pago'
```

**Frontend (`Orders.tsx`):**
```
'Recebido' | 'Em Reparo' | 'Pronto' | 'Entregue'
```

**Solução:** Padronizar os status em um único lugar (schema) e atualizar frontend.

---

### 5. BACKEND_CHECKLIST.md desatualizado

**Erros encontrados:**

| Linha | Problema | Correção |
|-------|----------|----------|
| 23 | Menciona `mysql2` | Deveria ser `pg` ou `postgres` |
| 157 | Lista tabela `customers` | Tabela não existe (clientes são externos) |
| 163 | Lista tabela `whatsappMessages` | Tabela foi removida do schema |
| 146 | Menciona "MySQL" no Docker | Deveria ser PostgreSQL/Supabase |

---

### 6. Rota de callback inconsistente

- **BACKEND_CHECKLIST.md:** `/api/oauth/callback`
- **AUTHENTICATION_PLAN.md:** `/api/auth/callback`

**Solução:** Padronizar para `/api/auth/callback` (mais claro).

---

### 7. Conflito de portas

- **Backend AxCellOS (planejado):** porta 3000
- **AppPortal:** porta 3000
- **AvAdmin Frontend:** porta 3001

**Solução:** Usar porta 3001 ou 3002 para backend do AxCellOS.

---

## 🟡 GAPS (Itens faltantes)

### 8. Router de `devices` não planejado

O schema tem tabela `devices`, mas não há router planejado para ela.

**Adicionar ao plano:**
```
#### 5.x. **Devices Router** (`server/routers/devices.ts`)
- [ ] `devices.list` - Listar aparelhos do cliente
- [ ] `devices.getById` - Obter aparelho por ID
- [ ] `devices.create` - Criar aparelho
- [ ] `devices.update` - Atualizar aparelho
- [ ] `devices.delete` - Deletar aparelho
- [ ] `devices.getByCustomer` - Listar aparelhos de um cliente
```

---

### 9. Router de `settings` não planejado

O schema tem tabela `settings`, mas não há router planejado.

**Adicionar ao plano:**
```
#### 5.x. **Settings Router** (`server/routers/settings.ts`)
- [ ] `settings.get` - Obter configuração por chave
- [ ] `settings.set` - Definir configuração
- [ ] `settings.getAll` - Listar todas configurações
```

---

### 10. Validação de módulo no frontend

O plano fala em validar módulo no backend, mas também deveria validar no frontend para evitar flash de conteúdo.

**Adicionar:**
```typescript
// No useAuth ou App.tsx
if (!user.enabled_modules.includes('AxCellOS')) {
  // Redirecionar para página de "módulo não habilitado"
  window.location.href = getAppPortalUrl() + '?error=module_not_enabled'
}
```

---

### 11. Campo `changedBy` no histórico

O campo `changedBy` em `serviceOrderHistory` é `integer`, mas o ID do usuário é `string` (CPF).

**Solução:**
```typescript
// ANTES
changedBy: integer("changedBy"),

// DEPOIS  
changedBy: varchar("changedBy", { length: 14 }),
```

---

## 🔵 MELHORIAS SUGERIDAS

### 12. Adicionar campo `createdBy` nas tabelas

Para auditoria, seria útil saber quem criou cada registro:

```typescript
createdBy: varchar("createdBy", { length: 14 }), // ID do usuário que criou
```

---

### 13. Usar enums para status

Em vez de `varchar` para status, usar enums PostgreSQL para validação:

```typescript
// Criar enum
export const orderStatusEnum = pgEnum('order_status', [
  'received', 'in_repair', 'ready', 'delivered', 'paid'
]);

// Usar na tabela
status: orderStatusEnum('status').default('received').notNull(),
```

---

### 14. JWT_SECRET exposto na documentação

O plano `AUTHENTICATION_PLAN.md` expõe o JWT_SECRET real:
```
JWT_SECRET=7e8b3e0b9569e981108237b28f79e689484de500f9505ed3d93c60e7657f00c5
```

**Solução:** Remover ou substituir por placeholder:
```
JWT_SECRET=your_jwt_secret_here
```

---

### 15. Cache de validação de token

O plano menciona "cache opcional", mas deveria ser mais específico:

**Recomendação:**
- Cache em memória (Redis ou Map) por 5 minutos
- Invalidar cache no logout
- Não cachear se token está próximo de expirar

---

## 📋 CHECKLIST DE CORREÇÕES

### Prioridade Alta (Bloqueadores)
- [ ] Corrigir tipo de `customerId` de `integer` para `varchar(14)`
- [ ] Corrigir tipo de `changedBy` de `integer` para `varchar(14)`
- [ ] Adicionar `accountId` em todas as tabelas para multi-tenancy
- [ ] Definir como buscar dados de clientes (criar endpoints ou usar existentes)

### Prioridade Média (Inconsistências)
- [ ] Atualizar BACKEND_CHECKLIST.md (remover MySQL, customers, whatsappMessages)
- [ ] Padronizar status de ordens entre schema e frontend
- [ ] Padronizar rota de callback (`/api/auth/callback`)
- [ ] Definir porta do backend (sugestão: 3001)

### Prioridade Baixa (Melhorias)
- [ ] Adicionar router de `devices`
- [ ] Adicionar router de `settings`
- [ ] Adicionar validação de módulo no frontend
- [ ] Adicionar campo `createdBy` nas tabelas
- [ ] Remover JWT_SECRET da documentação
- [ ] Documentar estratégia de cache

---

## ✅ DECISÕES TOMADAS (06/02/2026)

### 1. Clientes - Como gerenciar?
**Escolha: Opção C** - Usar `/api/internal/user/{cpf}` do AvAdmin para clientes
- Clientes são buscados via API interna existente
- NÃO existe tabela `customers` local
- ID do cliente = CPF (varchar 14)

### 2. Multi-tenancy - Como isolar dados?
**Escolha: Opção A** - Adicionar `accountId` em todas as tabelas
- Todas as tabelas terão campo `accountId` (CNPJ varchar 14)
- Todas as queries filtram por `accountId`
- Isolamento completo entre lojistas

### 3. Status de ordem - Qual lista usar?
**Escolha: Opção A** - Simplificado: `Aguardando`, `Pronto`, `Pago`
- Alinha com o frontend atual (`OrdersContext.tsx`)
- Fluxo mais simples e direto

---

## ✅ CORREÇÕES APLICADAS

### Documentação atualizada:

| Arquivo | Correções |
|---------|-----------|
| `AVADMIN_INTEGRATION.md` | Atualizado para usar `/api/internal/user/{cpf}`, removido endpoints inexistentes, adicionado multi-tenancy |
| `SCHEMA_DOCUMENTATION.md` | Adicionado `accountId` em todas tabelas, corrigido `customerId` para varchar(14), status simplificado |
| `BACKEND_CHECKLIST.md` | Removido mysql2 (usar pg), removido customers/whatsapp routers, adicionado devices/settings routers, porta 3010 |
| `AUTHENTICATION_PLAN.md` | Removido JWT_SECRET exposto, corrigido porta para 3010, adicionado notas sobre multi-tenancy |

---

## 📋 CHECKLIST DE CORREÇÕES (ATUALIZADO)

### ✅ Prioridade Alta (Resolvidos na documentação)
- [x] Definir como buscar dados de clientes → Opção C escolhida
- [x] Definir multi-tenancy → Opção A escolhida
- [x] Definir status de ordens → Opção A escolhida
- [x] Atualizar documentação com decisões

### ⏳ Prioridade Alta (Pendente no código)
- [ ] Corrigir tipo de `customerId` de `integer` para `varchar(14)` em `drizzle/schema.ts`
- [ ] Corrigir tipo de `changedBy` de `integer` para `varchar(14)` em `drizzle/schema.ts`
- [ ] Adicionar `accountId` varchar(14) em todas as tabelas em `drizzle/schema.ts`
- [ ] Gerar e aplicar migrações

### ✅ Prioridade Média (Resolvidos)
- [x] Atualizar BACKEND_CHECKLIST.md (remover MySQL, customers, whatsappMessages)
- [x] Padronizar status de ordens (Aguardando, Pronto, Pago)
- [x] Padronizar rota de callback (`/api/auth/callback`)
- [x] Definir porta do backend (3010)

### ⏳ Prioridade Média (Pendente no código)
- [ ] Atualizar frontend para usar status simplificados (se necessário)

### ✅ Prioridade Baixa (Resolvidos na documentação)
- [x] Adicionar router de `devices` ao plano
- [x] Adicionar router de `settings` ao plano
- [x] Remover JWT_SECRET da documentação
- [x] Documentar estratégia de multi-tenancy

### ⏳ Prioridade Baixa (Pendente)
- [ ] Adicionar validação de módulo no frontend
- [ ] Adicionar campo `createdBy` nas tabelas (opcional)
- [ ] Documentar estratégia de cache (opcional)

---

## 📊 RESUMO

| Categoria | Total | Resolvido | Pendente |
|-----------|-------|-----------|----------|
| Erros Críticos | 3 | 0 (doc) | 3 (código) |
| Inconsistências | 4 | 4 | 0 |
| Gaps (faltantes) | 4 | 3 | 1 |
| Melhorias | 4 | 2 | 2 |
| Decisões | 3 | 3 | 0 |

**Status:** Documentação corrigida. Próximo passo: atualizar `drizzle/schema.ts` com as correções.

---

**Última atualização:** 06/02/2026 - Decisões tomadas e documentação atualizada
