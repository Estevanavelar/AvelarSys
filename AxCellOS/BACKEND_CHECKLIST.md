# Checklist - O que falta para começar o Backend

## 📋 Resumo Executivo

O sistema **AxCellOS** possui:
- ✅ Frontend React/TypeScript completo e funcional
- ✅ Schema do banco de dados (Drizzle ORM) definido
- ✅ Docker Compose para frontend
- ❌ **Backend completamente ausente**

O frontend está configurado para usar **tRPC** e espera endpoints em `/api/trpc`, mas não existe nenhum servidor backend implementado.

---

## ⚠️ DECISÕES TOMADAS

1. **Clientes**: Usar endpoint existente `/api/internal/user/{cpf}` do AvAdmin
   - NÃO existe tabela `customers` local
   - NÃO criar Customers Router

2. **Multi-tenancy**: Adicionar `accountId` (CNPJ) em todas as tabelas
   - Todas as queries filtram por `accountId`
   - Dados isolados por lojista

3. **Status de Ordem**: Simplificado (`Aguardando`, `Pronto`, `Pago`)

4. **WhatsApp**: NÃO implementar por enquanto
   - NÃO existe tabela `whatsappMessages`
   - NÃO criar WhatsApp Router

---

## 🔴 Itens Críticos Faltantes

### 1. **Estrutura do Backend**
- [ ] Criar diretório `server/` na raiz do projeto
- [ ] Configurar `package.json` para o backend
- [ ] Instalar dependências do backend:
  - `@trpc/server`
  - `drizzle-orm`
  - `pg` (driver PostgreSQL)
  - `express` (ou `fastify`)
  - `zod` (validação)
  - `superjson` (serialização)
  - `dotenv` (variáveis de ambiente)
  - `cookie-parser` (para cookies)
  - `axios` (para chamar AvAdmin API)

### 2. **Arquivo de Configuração do Cliente tRPC**
- [ ] Criar `client/src/lib/trpc.ts` (arquivo faltante que está sendo importado)
  - Este arquivo deve exportar o cliente tRPC tipado
  - Deve usar `createTRPCReact` do `@trpc/react-query`

### 3. **Servidor HTTP**
- [ ] Criar servidor Express/Fastify
- [ ] Configurar middleware CORS
- [ ] Configurar middleware de cookies (para autenticação)
- [ ] Configurar rota `/api/trpc/*` para tRPC
- [ ] Configurar rota `/api/auth/callback` para callback de autenticação

### 4. **Conexão com Banco de Dados**
- [ ] Criar arquivo de configuração do Drizzle (`server/db.ts`)
- [ ] Configurar variável `DATABASE_URL` no `.env` (Supabase self-hosted)
- [ ] Configurar schema `avelar_axcellos` no Supabase
- [ ] Criar pool de conexões PostgreSQL (Supabase)
- [ ] Testar conexão com banco de dados
- [ ] Aplicar migrações no schema `avelar_axcellos`

### 5. **Roteadores tRPC**

#### 5.1. **Auth Router** (`server/routers/auth.ts`)
- [ ] `auth.me` - Query para obter usuário atual (via AvAdmin API)
- [ ] `auth.logout` - Mutation para logout
- [ ] Middleware de autenticação (`protectedProcedure`)
- [ ] Integração com AvAdmin API (validação de token)
- [ ] Cliente HTTP para chamar API do AvAdmin
- [ ] Cache de sessão local (cookies)

#### 5.2. **Devices Router** (`server/routers/devices.ts`)
- [ ] `devices.list` - Listar aparelhos (filtrado por accountId)
- [ ] `devices.getById` - Obter aparelho por ID
- [ ] `devices.getByCustomer` - Listar aparelhos de um cliente
- [ ] `devices.create` - Criar aparelho
- [ ] `devices.update` - Atualizar aparelho
- [ ] `devices.delete` - Deletar aparelho

#### 5.3. **Orders Router** (`server/routers/orders.ts`)
- [ ] `orders.list` - Listar ordens de serviço (filtrado por accountId)
- [ ] `orders.getById` - Obter ordem por ID
- [ ] `orders.create` - Criar ordem de serviço
- [ ] `orders.update` - Atualizar ordem
- [ ] `orders.updateStatus` - Atualizar status da ordem (Aguardando→Pronto→Pago)
- [ ] `orders.getHistory` - Obter histórico de mudanças
- [ ] `orders.delete` - Deletar ordem

#### 5.4. **Products Router** (`server/routers/products.ts`)
- [ ] `products.list` - Listar produtos (filtrado por accountId)
- [ ] `products.getById` - Obter produto por ID
- [ ] `products.create` - Criar produto
- [ ] `products.update` - Atualizar produto
- [ ] `products.delete` - Deletar produto
- [ ] `products.search` - Buscar produtos
- [ ] `products.uploadImage` - Upload de imagem (S3)

#### 5.5. **Sales Router** (`server/routers/sales.ts`)
- [ ] `sales.list` - Listar vendas (filtrado por accountId)
- [ ] `sales.getById` - Obter venda por ID
- [ ] `sales.create` - Criar venda (PDV)
- [ ] `sales.update` - Atualizar venda
- [ ] `sales.cancel` - Cancelar venda
- [ ] `sales.getReport` - Relatório de vendas

#### 5.6. **Settings Router** (`server/routers/settings.ts`)
- [ ] `settings.get` - Obter configuração (filtrado por accountId)
- [ ] `settings.set` - Salvar configuração
- [ ] `settings.getAll` - Listar todas as configurações

#### 5.7. **Reports Router** (`server/routers/reports.ts`)
- [ ] `reports.sales` - Relatório de vendas
- [ ] `reports.orders` - Relatório de ordens
- [ ] `reports.dashboard` - Dados do dashboard

### 6. **App Router Principal**
- [ ] Criar `server/routers/_app.ts` ou `server/routers/index.ts`
- [ ] Combinar todos os routers em um `appRouter`
- [ ] Exportar tipos TypeScript para o frontend

### 7. **Variáveis de Ambiente**
- [ ] Criar `.env.example` com todas as variáveis necessárias:
  ```env
  # Database (Supabase Self-hosted)
  DATABASE_URL=postgresql://user:password@host:5432/database
  DATABASE_SCHEMA=avelar_axcellos
  
  # Server
  PORT=3010
  NODE_ENV=development
  
  # AvAdmin API (comunicação interna)
  AVADMIN_INTERNAL_API_URL=http://avadmin-backend:5000/api/internal
  
  # OAuth (AppPortal)
  APP_PORTAL_URL=https://app.avelarcompany.dev.br
  APP_ID=axcellos
  
  # CORS
  CORS_ORIGINS=http://localhost:4010,https://axcellos.avelarcompany.com.br
  
  # Storage (S3)
  S3_BUCKET_NAME=
  S3_REGION=
  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  ```

### 8. **Docker Compose**
- [ ] Adicionar serviço backend ao `docker-compose.yml`
- [ ] Configurar rede compartilhada (`avelarsys-network`)
- [ ] Configurar porta 3010 para backend
- [ ] NÃO adicionar MySQL (usamos Supabase externo)

### 9. **Migrações do Banco de Dados**
- [ ] Atualizar `drizzle/schema.ts` com correções:
  - Adicionar `accountId` (varchar 14) em todas as tabelas
  - Alterar `customerId` para varchar(14) (CPF)
  - Alterar `changedBy` para varchar(14) (CPF)
- [ ] Gerar migrações: `npx drizzle-kit generate:pg`
- [ ] Aplicar migrações no Supabase
- [ ] Verificar se todas as tabelas foram criadas:
  - ✅ `devices`
  - ✅ `serviceOrders`
  - ✅ `serviceOrderHistory`
  - ✅ `products`
  - ✅ `sales`
  - ✅ `saleItems`
  - ✅ `settings`
- [ ] **NÃO criar**: `customers`, `whatsappMessages`, `users`

### 10. **Autenticação e Segurança**
- [ ] Implementar middleware de autenticação
- [ ] Extrair `accountId` do token JWT
- [ ] Validar token via AvAdmin API (`/api/internal/validate-token`)
- [ ] Configurar cookies seguros (httpOnly, secure, sameSite)
- [ ] Implementar multi-tenancy (filtrar por accountId)

### 11. **Tratamento de Erros**
- [ ] Criar formatador de erros customizado
- [ ] Implementar logging adequado
- [ ] Tratar erros de banco de dados
- [ ] Tratar erros de validação (Zod)
- [ ] Tratar erro de módulo não habilitado

### 12. **Scripts de Desenvolvimento**
- [ ] Adicionar scripts ao `package.json` do backend:
  - `dev` - Rodar em modo desenvolvimento
  - `build` - Compilar TypeScript
  - `start` - Rodar produção
  - `db:push` - Aplicar migrações
  - `db:studio` - Abrir Drizzle Studio

---

## 📁 Estrutura de Diretórios Sugerida

```
AxCellOS/
├── client/              # ✅ Já existe
├── server/              # ❌ Criar
│   ├── src/
│   │   ├── routers/
│   │   │   ├── _app.ts
│   │   │   ├── auth.ts
│   │   │   ├── devices.ts
│   │   │   ├── orders.ts
│   │   │   ├── products.ts
│   │   │   ├── sales.ts
│   │   │   ├── settings.ts
│   │   │   └── reports.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── multiTenancy.ts
│   │   │   └── errorHandler.ts
│   │   ├── db/
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   ├── trpc.ts
│   │   │   ├── avadmin.ts      # Cliente para AvAdmin API
│   │   │   └── storage.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── drizzle/            # ✅ Já existe (precisa atualizar schema)
├── docker-compose.yml   # ⚠️ Precisa adicionar serviço backend
└── .env.example         # ❌ Criar
```

---

## 🔗 Dependências do Frontend que Precisam de Backend

### Arquivos que importam tRPC mas não existem:
1. `client/src/lib/trpc.ts` - **CRÍTICO** (importado em `main.tsx` e `useAuth.ts`)

### Endpoints esperados pelo frontend:
1. `trpc.auth.me` - Verificar usuário autenticado
2. `trpc.auth.logout` - Fazer logout
3. `trpc.orders.*` - CRUD de ordens
4. `trpc.products.*` - CRUD de produtos
5. `trpc.sales.*` - CRUD de vendas

---

## ⚠️ Observações Importantes

1. **Frontend usa localStorage temporariamente**: Os contextos (`OrdersContext`, `ProductsContext`) estão usando localStorage como fallback. Quando o backend estiver pronto, devem migrar para usar tRPC.

2. **Autenticação Fake**: O frontend tem `VITE_FAKE_AUTH=true` no `.env.development`, permitindo desenvolvimento sem backend. Isso deve ser removido quando o backend estiver funcionando.

3. **URL do Backend**: O frontend está configurado para chamar `/api/trpc` (relativo), então o backend precisa estar no mesmo domínio ou configurar proxy no Vite.

4. **Schema do Banco**: O schema precisa ser atualizado em `drizzle/schema.ts` antes de aplicar migrações:
   - Adicionar `accountId` em todas as tabelas
   - Alterar `customerId` para varchar(14)

5. **Porta do Backend**: Usar porta 3010 (não 3000) para evitar conflito com outros serviços.

6. **Clientes**: Buscar via `/api/internal/user/{cpf}` do AvAdmin (não criar tabela local).

---

## 🚀 Próximos Passos Recomendados

1. **Atualizar schema** (`drizzle/schema.ts`) com accountId e customerId corrigidos
2. **Criar estrutura básica do backend** (servidor HTTP + tRPC)
3. **Criar arquivo `client/src/lib/trpc.ts`** (crítico para o frontend funcionar)
4. **Implementar Auth Router** (necessário para autenticação)
5. **Configurar banco de dados** e aplicar migrações
6. **Implementar routers principais** (devices, orders, products, sales)
7. **Configurar Docker Compose** com serviço backend
8. **Migrar frontend** de localStorage para tRPC

---

## 📝 Notas Técnicas

- **Stack**: Node.js + Express/Fastify + tRPC + Drizzle ORM + PostgreSQL (Supabase)
- **Portas**: 
  - Frontend: 4010
  - Backend: 3010
- **Banco de dados**: 
  - **Autenticação**: AvAdmin API + Neon (gerenciado pelo AvAdmin)
  - **Dados do sistema**: PostgreSQL Supabase self-hosted (schema `avelar_axcellos`)
- **Autenticação**: AvAdmin API interna (`/api/internal/validate-token`)
- **Multi-tenancy**: Filtrar por `accountId` em todas as queries
