# 🔐 Plano de Implementação de Autenticação - AxCellOS

## 📋 Visão Geral

Este documento descreve o plano completo para implementar autenticação via API do AvAdmin no sistema AxCellOS, permitindo que lojistas façam login e acessem o sistema como um módulo do Avelar System.

---

## 🎯 Objetivos

1. **Autenticação de Lojistas**: Permitir que lojistas façam login via AvAdmin e acessem o AxCellOS
2. **Validação de Token**: Validar tokens JWT via API interna do AvAdmin
3. **Integração com AppPortal**: Permitir redirecionamento do AppPortal para o AxCellOS
4. **Gerenciamento de Sessão**: Gerenciar sessões de usuários autenticados
5. **Proteção de Rotas**: Proteger rotas do backend com middleware de autenticação

---

## 🏗️ Arquitetura de Autenticação

### Fluxo de Autenticação

```
┌─────────────────┐
│   AppPortal     │  ← Login inicial (CPF/CNPJ + Senha)
└────────┬────────┘
         │
         │ POST /api/auth/login
         ▼
┌─────────────────┐
│   AvAdmin API   │  ← Valida credenciais, retorna JWT
└────────┬────────┘
         │
         │ Token JWT + UserInfo
         ▼
┌─────────────────┐
│   AppPortal     │  ← Salva token no localStorage
└────────┬────────┘
         │
         │ Redireciona com token
         ▼
┌─────────────────┐
│   AxCellOS      │  ← Recebe token via URL ou cookie
└────────┬────────┘
         │
         │ Valida token via API interna
         ▼
┌─────────────────┐
│   AvAdmin API   │  ← POST /api/internal/validate-token
└────────┬────────┘
         │
         │ UserData + AccountData
         ▼
┌─────────────────┐
│   AxCellOS      │  ← Usuário autenticado, sessão criada
└─────────────────┘
```

---

## 📦 Componentes Necessários

### 1. Backend (Node.js + tRPC)

#### 1.1. Estrutura de Pastas
```
server/
├── src/
│   ├── routers/
│   │   ├── _app.ts          # Router principal
│   │   └── auth.ts          # Router de autenticação
│   ├── middleware/
│   │   ├── auth.ts          # Middleware de autenticação
│   │   └── errorHandler.ts  # Tratamento de erros
│   ├── lib/
│   │   ├── avadmin.ts       # Cliente HTTP para AvAdmin API
│   │   └── trpc.ts          # Configuração tRPC
│   ├── db/
│   │   └── index.ts         # Conexão com banco de dados
│   └── server.ts            # Servidor Express/Fastify
├── package.json
├── tsconfig.json
└── .env
```

#### 1.2. Cliente HTTP para AvAdmin API (`server/src/lib/avadmin.ts`)

**Responsabilidades:**
- Validar tokens JWT via `/api/internal/validate-token`
- Buscar dados de usuário via `/api/internal/user/{user_id}`
- Buscar dados de conta via `/api/internal/account/{account_id}`
- Verificar acesso a módulo via `/api/internal/check-module-access`

**Estrutura:**
```typescript
interface AvAdminClient {
  validateToken(token: string): Promise<TokenValidationResponse>
  getUserById(userId: string): Promise<UserData>
  getAccountById(accountId: string): Promise<AccountData>
  checkModuleAccess(accountId: string, userId: string, module: string): Promise<ModuleAccessResponse>
}
```

**Endpoints AvAdmin:**
- `POST /api/internal/validate-token` - Validar token JWT
- `GET /api/internal/user/{user_id}` - Buscar dados do usuário
- `GET /api/internal/account/{account_id}` - Buscar dados da conta
- `POST /api/internal/check-module-access` - Verificar acesso ao módulo

#### 1.3. Middleware de Autenticação (`server/src/middleware/auth.ts`)

**Responsabilidades:**
- Extrair token de cookies ou headers
- Validar token via AvAdmin API
- Verificar acesso ao módulo "AxCellOS"
- Adicionar dados do usuário ao contexto da requisição

**Fluxo:**
1. Extrair token de `Authorization: Bearer {token}` ou cookie `app_session_id`
2. Chamar `AvAdminClient.validateToken(token)`
3. Verificar se `response.valid === true`
4. Verificar acesso ao módulo via `checkModuleAccess`
5. Adicionar `user` e `account` ao contexto tRPC

#### 1.4. Router de Autenticação (`server/src/routers/auth.ts`)

**Procedures tRPC:**

1. **`auth.me`** - Query
   - Retorna dados do usuário autenticado
   - Usa middleware de autenticação
   - Retorna: `UserInfo`

2. **`auth.logout`** - Mutation
   - Remove sessão do usuário
   - Limpa cookies
   - Retorna: `{ success: boolean }`

3. **`auth.validateSession`** - Query (opcional)
   - Valida se sessão atual é válida
   - Retorna: `{ valid: boolean, user?: UserInfo }`

#### 1.5. Protected Procedure

Criar `protectedProcedure` que usa o middleware de autenticação:

```typescript
const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // Validar token via AvAdmin API
  // Verificar acesso ao módulo
  // Adicionar user ao ctx
  return next({ ctx: { ...ctx, user } })
})
```

### 2. Frontend (React + TypeScript)

#### 2.1. Arquivo `client/src/lib/trpc.ts` (CRÍTICO - FALTANTE)

**Responsabilidades:**
- Criar cliente tRPC tipado
- Configurar links HTTP
- Configurar transformer (superjson)
- Configurar cookies para autenticação

**Estrutura:**
```typescript
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../server/src/routers/_app'

export const trpc = createTRPCReact<AppRouter>()
```

#### 2.2. Hook `useAuth` (Atualizar)

**Mudanças necessárias:**
- Remover modo fake (`VITE_FAKE_AUTH`)
- Usar `trpc.auth.me.useQuery()` para verificar autenticação
- Implementar redirecionamento para AppPortal quando não autenticado
- Gerenciar token via cookies (httpOnly)

**Fluxo:**
1. Verificar se há token no cookie
2. Chamar `trpc.auth.me.useQuery()`
3. Se não autenticado, redirecionar para AppPortal
4. Se autenticado, retornar dados do usuário

#### 2.3. Página de Login/Callback (`client/src/pages/Login.tsx` ou callback)

**Responsabilidades:**
- Receber token via URL query parameter (`?token=...` ou `?auth=...`)
- Enviar token para backend via cookie
- Redirecionar para dashboard após autenticação

**Fluxo:**
1. Ler token da URL (`window.location.search`)
2. Fazer requisição para `/api/auth/callback` com token
3. Backend valida token e cria sessão (cookie)
4. Redirecionar para `/dashboard`

#### 2.4. Atualizar `const.ts`

**Adicionar:**
- URL do AppPortal: `VITE_APP_PORTAL_URL`
- URL do AvAdmin API: `VITE_AVADMIN_API_URL`
- App ID: `VITE_APP_ID` (já existe: `axcellos-dev`)

### 3. Configuração do AppPortal

#### 3.1. Adicionar AxCellOS ao `MODULE_DOMAINS`

**Arquivo:** `AppPortal/src/lib/redirect.ts`

**Adicionar:**
```typescript
export const MODULE_DOMAINS: Record<string, string> = {
  AvAdmin: 'https://avadmin.avelarcompany.com.br',
  StockTech: 'https://stocktech.avelarcompany.com.br',
  Shop: 'https://shop.avelarcompany.com.br',
  Naldo: 'https://naldo.avelarcompany.com.br',
  AxCellOS: 'https://axcellos.avelarcompany.com.br', // NOVO
}
```

**Adicionar ícone e descrição:**
```typescript
export const MODULE_ICONS: Record<string, string> = {
  // ...
  AxCellOS: '📱', // NOVO
}

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  // ...
  AxCellOS: 'Sistema de Gestão para Assistência Técnica', // NOVO
}
```

### 4. Configuração do AvAdmin

#### 4.1. Habilitar Módulo AxCellOS para Contas

**Verificar:**
- Quando criar conta de lojista, adicionar "AxCellOS" aos `enabled_modules`
- Permitir que super_admin habilite/desabilite módulo para contas

**Localização:** `AvAdmin/backend/app/services/auth.py` - método `create_account_with_admin`

---

## 🔧 Implementação Detalhada

### Fase 1: Configuração Base

#### 1.1. Criar estrutura do backend
- [ ] Criar diretório `server/`
- [ ] Criar `server/package.json` com dependências:
  - `@trpc/server`
  - `express` ou `fastify`
  - `drizzle-orm`
  - `postgres` (pg)
  - `zod`
  - `superjson`
  - `cookie-parser` (se usar Express)
  - `axios` ou `node-fetch` (para chamadas HTTP)
- [ ] Criar `server/tsconfig.json`
- [ ] Criar `server/.env` com variáveis:
  - `DATABASE_URL` (Supabase)
  - `AVADMIN_INTERNAL_API_URL` (URL da API interna do AvAdmin)
  - `PORT=3010`
  - `NODE_ENV=development`
  - `CORS_ORIGINS` (domínios permitidos)

#### 1.2. Criar cliente AvAdmin
- [ ] Criar `server/src/lib/avadmin.ts`
- [ ] Implementar `AvAdminClient` com métodos:
  - `validateToken(token: string)`
  - `getUserById(userId: string)`
  - `getAccountById(accountId: string)`
  - `checkModuleAccess(accountId, userId, module)`
- [ ] Configurar timeout e retry logic
- [ ] Tratar erros de conexão

#### 1.3. Criar middleware de autenticação
- [ ] Criar `server/src/middleware/auth.ts`
- [ ] Implementar extração de token (cookie + header)
- [ ] Implementar validação via AvAdmin API
- [ ] Implementar verificação de acesso ao módulo
- [ ] Adicionar user ao contexto

### Fase 2: Backend - Routers tRPC

#### 2.1. Criar router de autenticação
- [ ] Criar `server/src/routers/auth.ts`
- [ ] Implementar `auth.me` query
- [ ] Implementar `auth.logout` mutation
- [ ] Criar `protectedProcedure` usando middleware

#### 2.2. Criar router principal
- [ ] Criar `server/src/routers/_app.ts`
- [ ] Combinar todos os routers
- [ ] Exportar tipo `AppRouter` para frontend

#### 2.3. Criar servidor HTTP
- [ ] Criar `server/src/server.ts`
- [ ] Configurar Express/Fastify
- [ ] Configurar CORS
- [ ] Configurar cookie parser
- [ ] Configurar rota `/api/trpc/*` para tRPC
- [ ] Configurar rota `/api/auth/callback` para callback de autenticação

### Fase 3: Frontend - Cliente tRPC

#### 3.1. Criar arquivo `trpc.ts` (CRÍTICO)
- [ ] Criar `client/src/lib/trpc.ts`
- [ ] Configurar `createTRPCReact<AppRouter>`
- [ ] Configurar `httpBatchLink` com URL `/api/trpc`
- [ ] Configurar `superjson` transformer
- [ ] Configurar cookies (`credentials: "include"`)

#### 3.2. Atualizar `useAuth.ts`
- [ ] Remover lógica de fake auth
- [ ] Usar `trpc.auth.me.useQuery()`
- [ ] Implementar redirecionamento para AppPortal quando não autenticado
- [ ] Atualizar função `login()` para redirecionar para AppPortal

#### 3.3. Criar página de callback
- [ ] Criar `client/src/pages/Callback.tsx` ou `Login.tsx`
- [ ] Ler token da URL
- [ ] Enviar token para backend
- [ ] Redirecionar após autenticação

#### 3.4. Atualizar `const.ts`
- [ ] Adicionar `VITE_APP_PORTAL_URL`
- [ ] Adicionar `VITE_AVADMIN_API_URL`
- [ ] Verificar `VITE_APP_ID` (deve ser `axcellos-dev`)

### Fase 4: Integração com AppPortal

#### 4.1. Atualizar AppPortal
- [ ] Adicionar AxCellOS ao `MODULE_DOMAINS`
- [ ] Adicionar ícone e descrição
- [ ] Testar redirecionamento

#### 4.2. Configurar redirecionamento
- [ ] Verificar formato de URL de callback no AxCellOS
- [ ] Configurar `getAuthenticatedRedirectUrl` para AxCellOS
- [ ] Testar fluxo completo: Login → AppPortal → AxCellOS

### Fase 5: Proteção de Rotas

#### 5.1. Proteger routers tRPC
- [ ] Adicionar `protectedProcedure` aos routers que precisam autenticação:
  - `orders.*`
  - `products.*`
  - `sales.*`
  - `customers.*` (se necessário)
- [ ] Manter rotas públicas apenas para `auth.*`

#### 5.2. Proteger rotas do frontend
- [ ] Atualizar `App.tsx` para verificar autenticação
- [ ] Redirecionar para login se não autenticado
- [ ] Proteger rotas com componente `ProtectedRoute`

### Fase 6: Gerenciamento de Sessão

#### 6.1. Cookies
- [ ] Configurar cookie `app_session_id` (httpOnly, secure em produção)
- [ ] Configurar `sameSite: 'lax'` ou `'strict'`
- [ ] Configurar expiração baseada no token JWT

#### 6.2. Refresh Token (Opcional)
- [ ] Implementar refresh de token antes de expirar
- [ ] Atualizar cookie automaticamente

### Fase 7: Tratamento de Erros

#### 7.1. Erros de autenticação
- [ ] Tratar token inválido/expirado
- [ ] Tratar módulo não habilitado
- [ ] Tratar conta inativa
- [ ] Redirecionar para AppPortal em caso de erro

#### 7.2. Erros de conexão
- [ ] Tratar falha de conexão com AvAdmin API
- [ ] Implementar retry logic
- [ ] Mostrar mensagem de erro ao usuário

---

## 🔐 Segurança

### 1. Validação de Token
- ✅ Sempre validar token via AvAdmin API (não confiar apenas em JWT local)
- ✅ Verificar expiração do token
- ✅ Verificar assinatura do token

### 2. Cookies
- ✅ Usar `httpOnly` para prevenir XSS
- ✅ Usar `secure` em produção (HTTPS)
- ✅ Usar `sameSite: 'lax'` ou `'strict'`

### 3. CORS
- ✅ Configurar CORS apenas para domínios permitidos:
  - `https://app.avelarcompany.com.br` (AppPortal)
  - `https://axcellos.avelarcompany.com.br` (AxCellOS)
  - `http://localhost:4010` (desenvolvimento)

### 4. Rate Limiting
- ✅ Implementar rate limiting nas rotas de autenticação
- ✅ Limitar tentativas de validação de token

---

## 📝 Variáveis de Ambiente

### Backend (`server/.env`)
```env
# Database (Supabase Self-hosted)
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SCHEMA=avelar_axcellos

# Server
PORT=3010
NODE_ENV=development

# AvAdmin API (comunicação interna - server-to-server)
AVADMIN_INTERNAL_API_URL=http://avadmin-backend:5000/api/internal

# CORS
CORS_ORIGINS=http://localhost:4010,https://axcellos.avelarcompany.com.br,https://app.avelarcompany.com.br
```

**NOTA**: Não é necessário JWT_SECRET local. A validação de tokens é feita via API do AvAdmin.

### Frontend (`client/.env.development`)
```env
VITE_APP_PORTAL_URL=https://app.avelarcompany.com.br
VITE_AVADMIN_API_URL=https://avadmin.avelarcompany.com.br
VITE_APP_ID=axcellos-dev
VITE_FAKE_AUTH=false  # REMOVER ou false
```

---

## 🧪 Testes

### 1. Testes de Autenticação
- [ ] Testar login via AppPortal → redirecionamento para AxCellOS
- [ ] Testar validação de token válido
- [ ] Testar validação de token inválido/expirado
- [ ] Testar acesso sem token (deve redirecionar)
- [ ] Testar logout

### 2. Testes de Acesso ao Módulo
- [ ] Testar acesso com módulo habilitado
- [ ] Testar acesso com módulo não habilitado (deve negar)
- [ ] Testar acesso com conta inativa (deve negar)

### 3. Testes de Integração
- [ ] Testar fluxo completo: Login → AppPortal → AxCellOS → Dashboard
- [ ] Testar refresh de página (deve manter sessão)
- [ ] Testar múltiplas abas (deve compartilhar sessão)

---

## 📋 Checklist de Implementação

### Backend
- [ ] Estrutura de pastas criada
- [ ] Cliente AvAdmin implementado
- [ ] Middleware de autenticação implementado
- [ ] Router de autenticação implementado
- [ ] Router principal criado
- [ ] Servidor HTTP configurado
- [ ] Rota `/api/trpc/*` configurada
- [ ] Rota `/api/auth/callback` configurada
- [ ] Cookies configurados
- [ ] CORS configurado
- [ ] Tratamento de erros implementado

### Frontend
- [ ] Arquivo `lib/trpc.ts` criado (CRÍTICO)
- [ ] Hook `useAuth` atualizado
- [ ] Página de callback criada
- [ ] `const.ts` atualizado
- [ ] Proteção de rotas implementada
- [ ] Redirecionamento para AppPortal implementado

### Integração
- [ ] AppPortal atualizado com AxCellOS
- [ ] Redirecionamento testado
- [ ] Fluxo completo testado

### Documentação
- [ ] Documentação atualizada
- [ ] README atualizado com instruções de autenticação

---

## 🚀 Próximos Passos Após Implementação

1. **Habilitar módulo para contas existentes**
   - Adicionar "AxCellOS" aos `enabled_modules` das contas que devem ter acesso

2. **Configurar domínio de produção**
   - Configurar `axcellos.avelarcompany.com.br`
   - Configurar SSL/HTTPS
   - Atualizar CORS no AvAdmin

3. **Monitoramento**
   - Implementar logging de autenticações
   - Monitorar falhas de validação de token
   - Alertas para tentativas de acesso não autorizado

4. **Otimizações**
   - Cache de validação de token (opcional, com cuidado)
   - Refresh automático de token antes de expirar

---

## 📚 Referências

### Arquivos Importantes

**AvAdmin:**
- `backend/app/routes/auth.py` - Rotas de autenticação
- `backend/app/routes/internal_api.py` - API interna para validação
- `backend/app/services/auth.py` - Serviço de autenticação
- `backend/app/core/security.py` - Utilitários de segurança

**AppPortal:**
- `src/lib/redirect.ts` - Lógica de redirecionamento
- `src/app/login/page.tsx` - Página de login
- `src/app/select-module/page.tsx` - Seleção de módulos

**AxCellOS:**
- `client/src/_core/hooks/useAuth.ts` - Hook de autenticação (atualizar)
- `client/src/const.ts` - Constantes (atualizar)
- `client/src/lib/trpc.ts` - **CRIAR** (faltante)

---

## ⚠️ Observações Importantes

1. **Token JWT**: O token é gerado pelo AvAdmin e deve ser validado via API interna. Não confiar apenas em validação local do JWT.

2. **Módulo**: O AxCellOS precisa estar listado nos `enabled_modules` da conta do lojista para permitir acesso.

3. **Clientes Finais**: Clientes finais são cadastrados no AvAdmin mas **NÃO** fazem login no AxCellOS. Apenas lojistas acessam o sistema.

4. **Sessão**: A sessão é gerenciada via cookies httpOnly no backend. O frontend não deve armazenar tokens em localStorage.

5. **Redirecionamento**: Quando não autenticado, o sistema deve redirecionar para o AppPortal com parâmetro de retorno.

6. **Multi-tenancy**: 
   - O `account_id` (CNPJ) é extraído do token JWT validado
   - Deve ser armazenado no contexto tRPC como `ctx.user.account_id`
   - **TODAS** as queries de dados devem filtrar por `accountId`
   - Garante isolamento de dados entre lojistas

7. **Busca de Clientes**: 
   - Clientes são buscados via `/api/internal/user/{cpf}` do AvAdmin
   - O ID do cliente é o CPF (string de 11-14 caracteres)
   - Não existe tabela `customers` local

8. **Porta do Backend**: Usar porta 3010 (não 3000) para evitar conflitos.

---

**Última atualização**: Plano criado após análise completa dos sistemas AppPortal e AvAdmin