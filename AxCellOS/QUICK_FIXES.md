╔════════════════════════════════════════════════════════════════════════════════════╗
║                    QUICK FIXES - AxCellOS Code Review                              ║
║                    Correções Imediatas (30 minutos cada)                            ║
╚════════════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #1: Remover Logs Sensíveis (CRÍTICO - 15 min)
═══════════════════════════════════════════════════════════════════════════════════════

ARQUIVO: server/src/server.ts (linhas 38-42)

❌ ANTES:
```typescript
app.use("/trpc", (req, res, next) => {
  const auth = req.headers['authorization'];
  const token = auth?.startsWith('Bearer ') ? auth.substring(7, 50) + '...' : 'none';
  console.log(`[tRPC] ${req.method} ${req.url} | Token: ${token}`);
  next();
});
```

✅ DEPOIS:
```typescript
app.use("/trpc", (req, res, next) => {
  const auth = req.headers['authorization'];
  console.log(`[tRPC] ${req.method} ${req.url} | Authenticated: ${!!auth}`);
  next();
});
```

ARQUIVO: server/src/routers/products.ts (linhas 20-22)

❌ ANTES:
```typescript
console.log('[Products] getProducts called');
console.log('[Products] ctx.accountId:', ctx.accountId);
console.log('[Products] ctx.account:', JSON.stringify(ctx.account));
```

✅ DEPOIS:
```typescript
// Remover completamente ou substituir por:
// logger.debug('[Products] getProducts called for account', { accountId: ctx.accountId });
```

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #2: Adicionar Rate Limiting (CRÍTICO - 20 min)
═══════════════════════════════════════════════════════════════════════════════════════

PASSO 1: Instalar dependência
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

PASSO 2: Criar arquivo: server/src/middleware/rateLimit.ts
```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter para APIs públicas
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por janela
  message: 'Muitas requisições, tente novamente mais tarde',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Rate limiter mais restritivo para autenticação
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por janela
  message: 'Muitas tentativas de login, tente novamente mais tarde',
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});
```

PASSO 3: Atualizar server.ts (após corsMiddleware):
```typescript
import { apiLimiter, authLimiter } from './middleware/rateLimit';

app.use(corsMiddleware);
app.use(apiLimiter); // ← ADICIONAR AQUI
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
```

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #3: Converter Error para TRPCError (CRÍTICO - 25 min)
═══════════════════════════════════════════════════════════════════════════════════════

ARQUIVO: server/src/routers/products.ts

❌ ANTES (linha 75-76):
```typescript
if (product.length === 0) {
  throw new Error("Produto não encontrado");
}
```

✅ DEPOIS:
```typescript
import { TRPCError } from "@trpc/server";

if (product.length === 0) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Produto não encontrado",
  });
}
```

ARQUIVO: server/src/routers/orders.ts

❌ ANTES (linha 74):
```typescript
if (orderData.length === 0) {
  throw new Error("Ordem não encontrada");
}
```

✅ DEPOIS:
```typescript
import { TRPCError } from "@trpc/server";

if (orderData.length === 0) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Ordem não encontrada",
  });
}
```

PROCURAR POR (em todos os routers):
- throw new Error( → throw new TRPCError({...})
- Usar codes: NOT_FOUND, UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, CONFLICT, etc.

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #4: Melhorar Validação de Null Safety (CRÍTICO - 20 min)
═══════════════════════════════════════════════════════════════════════════════════════

ARQUIVO: server/src/routers/products.ts

❌ ANTES (linha 69):
```typescript
eq(products.ownerCpf, ctx.account!.owner_cpf!)
```

✅ DEPOIS:
```typescript
// No início do procedure
if (!ctx.account?.owner_cpf) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Usuário não autenticado adequadamente",
  });
}

// Depois usar com segurança
eq(products.ownerCpf, ctx.account.owner_cpf)
```

PADRÃO A APLICAR em todos os protectedProcedure:
```typescript
export const getProducts: protectedProcedure
  .input(/* ... */)
  .query(async ({ ctx, input }) => {
    // ✅ Sempre validar ctx no início
    if (!ctx.user || !ctx.account?.owner_cpf) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Acesso negado",
      });
    }

    const ownerCpf = ctx.account.owner_cpf;
    // ... resto da lógica com ownerCpf seguro
  }),
```

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #5: Validação de Datas em Queries (MÉDIO - 15 min)
═══════════════════════════════════════════════════════════════════════════════════════

ARQUIVO: server/src/routers/orders.ts (linha 19-26)

❌ ANTES:
```typescript
dateFrom: z.string().optional(),
dateTo: z.string().optional(),
```

✅ DEPOIS:
```typescript
dateFrom: z.string().datetime().optional(), // Valida ISO 8601
dateTo: z.string().datetime().optional(),
```

VALIDAÇÃO ADICIONAL (mais robusta):
```typescript
const input = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).refine(
  (data) => {
    // Se ambas as datas estão presentes, dateTo deve ser >= dateFrom
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateTo) >= new Date(data.dateFrom);
    }
    return true;
  },
  {
    message: "dateTo deve ser maior ou igual a dateFrom",
    path: ["dateTo"],
  }
);
```

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #6: Adicionar ESLint & Prettier (MÉDIO - 30 min)
═══════════════════════════════════════════════════════════════════════════════════════

PASSO 1: Instalar dependências
```bash
cd server
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

PASSO 2: Criar .eslintrc.json
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/explicit-function-return-types": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

PASSO 3: Criar .prettierrc
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

PASSO 4: Atualizar package.json
```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "format:check": "prettier --check src/**/*.ts"
  }
}
```

PASSO 5: Executar
```bash
npm run lint:fix
npm run format
```

═══════════════════════════════════════════════════════════════════════════════════════
🚀 FIX #7: Setup Jest para Testes (CRÍTICO - 1 hora)
═══════════════════════════════════════════════════════════════════════════════════════

PASSO 1: Instalar dependências
```bash
cd server
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

PASSO 2: Criar jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

PASSO 3: Criar arquivo de teste: src/__tests__/routers/products.test.ts
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTRPCMsgsOpenRouter } from '@trpc/server/unstable-core-do-not-import';
import { z } from 'zod';

describe('Products Router', () => {
  it('should validate product input', async () => {
    const productInput = z.object({
      name: z.string().min(1),
      price: z.number().min(0),
    });

    const validData = { name: 'Product', price: 10 };
    const result = productInput.safeParse(validData);
    
    expect(result.success).toBe(true);
  });

  it('should reject invalid product input', async () => {
    const productInput = z.object({
      name: z.string().min(1),
      price: z.number().min(0),
    });

    const invalidData = { name: '', price: -10 };
    const result = productInput.safeParse(invalidData);
    
    expect(result.success).toBe(false);
  });
});
```

PASSO 4: Executar testes
```bash
npm test
npm test -- --coverage
```

═══════════════════════════════════════════════════════════════════════════════════════
📋 CHECKLIST DE IMPLEMENTAÇÃO
═══════════════════════════════════════════════════════════════════════════════════════

Marque conforme implementar:

[ ] FIX #1: Remover logs sensíveis
    - [ ] server.ts linha 40-41
    - [ ] products.ts linha 20-22
    - [ ] Revisar todos os console.log* para PII

[ ] FIX #2: Adicionar rate limiting
    - [ ] npm install express-rate-limit
    - [ ] Criar middleware/rateLimit.ts
    - [ ] Integrar em server.ts

[ ] FIX #3: Converter Error para TRPCError
    - [ ] products.ts
    - [ ] orders.ts
    - [ ] customers.ts
    - [ ] devices.ts
    - [ ] todos os routers

[ ] FIX #4: Melhorar null safety
    - [ ] Adicionar guard clauses em todos protectedProcedure
    - [ ] Remover ! (non-null assertions)

[ ] FIX #5: Validação de datas
    - [ ] orders.ts dateFrom/dateTo
    - [ ] Aplicar em outros routers

[ ] FIX #6: ESLint + Prettier
    - [ ] npm install devDeps
    - [ ] Criar .eslintrc.json
    - [ ] Criar .prettierrc
    - [ ] Executar lint:fix
    - [ ] Executar format

[ ] FIX #7: Setup Jest
    - [ ] npm install jest devDeps
    - [ ] Criar jest.config.js
    - [ ] Criar arquivo test inicial
    - [ ] npm test rodando

═══════════════════════════════════════════════════════════════════════════════════════
🎯 TEMPO ESTIMADO
═══════════════════════════════════════════════════════════════════════════════════════

FIX #1 (Logs):           15 min
FIX #2 (Rate Limit):     20 min
FIX #3 (TRPCError):      25 min
FIX #4 (Null Safety):    20 min
FIX #5 (Validação):      15 min
FIX #6 (Lint/Format):    30 min
FIX #7 (Jest):           60 min

TOTAL: ~3 horas para implementar tudo

═══════════════════════════════════════════════════════════════════════════════════════
