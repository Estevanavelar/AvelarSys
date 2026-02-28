# AxCellOS - Sistema de Ordem de Serviço para Lojas de Telefone

Sistema completo para gerenciamento de ordem de serviço de celulares com integração ao AvAdmin e App Portal.

> **✅ STATUS:** Sistema 100% Operacional - Pronto para Uso  
> **📄 Verificação Completa:** Ver [SYSTEM_VERIFICATION.md](./SYSTEM_VERIFICATION.md)

---

## 🏗️ Arquitetura

### Backend (Node.js + tRPC + Drizzle ORM)
- **Framework**: Express.js com tRPC para type-safe APIs
- **Banco**: PostgreSQL (Supabase self-hosted) - Schema `avelar_axcellos`
- **ORM**: Drizzle ORM com migrations
- **Autenticação**: JWT via AvAdmin API (server-to-server)
- **Multi-tenancy**: Isolamento por CNPJ da conta

### Frontend (React + TypeScript)
- **Framework**: React 19 com Vite + HMR
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Estado**: TanStack Query + tRPC
- **Roteamento**: Wouter
- **Autenticação**: Token via localStorage + cookie

### Infraestrutura
- **Containerização**: Docker Compose
- **Banco**: Supabase self-hosted porta 5433 (COMPARTILHADO)
- **Backend**: Porta **8004** (padrão backends: 8000-8999)
- **Frontend**: Porta **3004** (padrão frontends: 3000-3999)
- **Rede Docker**: `avelarsys-network`
- **Domínio**: https://axcellos.avelarcompany.com.br
- **SSL**: Let's Encrypt via Certbot

---

## 🚀 Como Usar

### 1. Verificar Status dos Containers
```bash
docker ps --filter "name=axcellos"
```

### 2. Acessar o Sistema
Abra no navegador:
```
https://axcellos.avelarcompany.com.br
```

### 3. Fazer Login
1. Click em "Entrar com Manus"
2. Faça login no App Portal
3. Sistema redireciona automaticamente de volta

### 4. Habilitar Acesso para Usuários
No **AvAdmin**, adicione `AxCellOS` ao campo `enabled_modules` dos usuários.

---

## 📊 Funcionalidades Disponíveis

### ✅ Gerenciamento de Produtos
- Cadastro, edição e exclusão de produtos
- Controle de estoque (atual, mínimo, máximo)
- SKU e código de barras
- Categorias e preços
- Imagens de produtos

### ✅ Gerenciamento de Clientes
- Cadastro de clientes (CPF/CNPJ)
- Controle de crédito e dívidas
- Histórico de compras
- Endereços e contatos

### ✅ Ordens de Serviço
- Criação de pedidos/ordens
- Múltiplos status (rascunho, confirmado, entregue, etc.)
- Itens com descontos
- Agendamento de entrega
- Métodos de pagamento

### ✅ Dispositivos
- Registro de dispositivos móveis
- Controle de push notifications
- Status de atividade

### ✅ Relatórios
- Vendas por período
- Ordens por status
- Produtos mais vendidos
- Análise de clientes

---

## 🔐 Autenticação

O sistema usa **autenticação centralizada** via App Portal:

1. **Redirect para Portal:** `https://app.avelarcompany.com.br/login?redirect=<URL>`
2. **Login no Portal:** Usuário faz login
3. **Retorno com Token:** Portal redireciona com `?token=...`
4. **Validação:** Backend valida token com AvAdmin
5. **Controle de Acesso:** Verifica se usuário tem módulo `AxCellOS` habilitado

---

## 🔧 Comandos Úteis

### Ver Logs
```bash
# Backend
docker logs avelarsys-axcellos-backend --tail 50 -f

# Frontend
docker logs avelarsys-axcellos-frontend --tail 50 -f
```

### Reiniciar Serviços
```bash
cd /home/avelarsys/AvelarSys/AxCellOS

# Reiniciar tudo
docker compose restart

# Reiniciar apenas um serviço
docker compose restart avelarsys-axcellos-backend
docker compose restart avelarsys-axcellos-frontend
```

### Parar e Iniciar
```bash
# Parar
docker compose down

# Iniciar
docker compose up -d
```

### Health Check
```bash
curl https://axcellos.avelarcompany.com.br/health
```

---

## 📦 Estrutura do Projeto

```
AxCellOS/
├── server/                      # Backend Node.js
│   ├── src/
│   │   ├── db/                 # Database (Drizzle ORM)
│   │   │   ├── schema.ts       # Tabelas do banco
│   │   │   └── index.ts        # Conexão Drizzle
│   │   ├── routers/            # tRPC Routers
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── customers.ts
│   │   │   ├── orders.ts
│   │   │   └── devices.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts         # Validação de token
│   │   │   └── cors.ts
│   │   ├── lib/
│   │   │   ├── trpc.ts         # Config tRPC
│   │   │   ├── config.ts       # Env vars
│   │   │   └── avadmin-api.ts  # Cliente AvAdmin
│   │   ├── server.ts           # Express server
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── client/                      # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes UI
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ui/            # shadcn/ui
│   │   ├── pages/             # Páginas
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── PDV.tsx
│   │   │   └── Settings.tsx
│   │   ├── _core/
│   │   │   └── hooks/
│   │   │       └── useAuth.ts
│   │   ├── lib/
│   │   │   └── trpc.ts        # Cliente tRPC
│   │   ├── contexts/          # Context API
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── const.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
│
├── docker-compose.yml           # Produção
├── docker-compose.override.yml  # Desenvolvimento (hot reload)
├── README.md
└── SYSTEM_VERIFICATION.md       # Relatório de verificação

```

---

## 🌐 URLs de Acesso

| Ambiente | Frontend | Backend API | Health Check |
|----------|----------|-------------|--------------|
| **Desenvolvimento** | http://localhost:3004 | http://localhost:8004/trpc | http://localhost:8004/health |
| **Produção** | https://axcellos.avelarcompany.com.br | https://axcellos.avelarcompany.com.br/trpc | https://axcellos.avelarcompany.com.br/health |

---

## 🗄️ Banco de Dados

### Tabelas Criadas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `devices` | Dispositivos móveis registrados |
| `products` | Catálogo de produtos |
| `customers` | Base de clientes (CPF/CNPJ) |
| `orders` | Ordens de serviço/pedidos |
| `order_items` | Itens dos pedidos |
| `sales` | Histórico de vendas |
| `settings` | Configurações do sistema |
| `report_data` | Dados para relatórios |

### Multi-tenancy
Todas as tabelas possuem `account_id` (CNPJ) para isolamento de dados por conta.

### Conexão
```
Host: host.docker.internal:5433
Database: postgres
Schema: avelar_axcellos
```

---

## 🔍 Troubleshooting

### Frontend não carrega
```bash
# Ver logs
docker logs avelarsys-axcellos-frontend --tail 50

# Reiniciar
docker compose restart avelarsys-axcellos-frontend
```

### Backend retorna 500
```bash
# Ver logs
docker logs avelarsys-axcellos-backend --tail 50

# Verificar health
curl https://axcellos.avelarcompany.com.br/health
```

### Erro de autenticação
1. Verificar se usuário tem módulo `AxCellOS` habilitado no AvAdmin
2. Limpar localStorage e cookies
3. Fazer login novamente

### Banco de dados não conecta
1. Verificar se Supabase está rodando: `docker ps | grep supabase`
2. Testar conexão: `psql -h localhost -p 5433 -U supabase_admin -d postgres`

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Ver [SYSTEM_VERIFICATION.md](./SYSTEM_VERIFICATION.md) - Relatório completo do sistema
2. Verificar logs dos containers
3. Consultar documentação do AvAdmin

1. **Fluxo**: Usuário faz login no AvAdmin
2. **Redirecionamento**: AvAdmin redireciona para AxCellOS com token JWT
3. **Validação**: Backend valida token via API interna do AvAdmin
4. **Autorização**: Verifica se usuário tem módulo AxCellOS habilitado

## 📊 Funcionalidades Implementadas

### ✅ Backend APIs (tRPC)
- **Auth**: Informações do usuário atual, validação de módulos
- **Products**: CRUD completo de produtos com controle de estoque
- **Customers**: Gerenciamento de clientes (local + integração AvAdmin)
- **Orders**: Sistema completo de pedidos com itens
- **Devices**: Registro e gerenciamento de dispositivos móveis

### ✅ Frontend
- **Login/Logout**: Integração com AvAdmin
- **Dashboard**: Visão geral com estatísticas
- **Produtos**: Listagem, criação e edição
- **Clientes**: Busca e gerenciamento
- **Pedidos**: Criação e acompanhamento

### ✅ Banco de Dados
- **9 tabelas** criadas no schema `avelar_axcellos`
- **Multi-tenancy** implementado (account_id por CNPJ)
- **Migrations** geradas com Drizzle Kit

## 🔧 Configuração

### Variáveis de Ambiente (Backend)
```env
# Database - Supabase COMPARTILHADO (use host.docker.internal para comunicação container → host)
DATABASE_URL=postgresql://supabase_admin:xxx@host.docker.internal:5433/postgres?options=-csearch_path%3Davelar_axcellos
DATABASE_SCHEMA=avelar_axcellos

# Server - PORTA 8003 (padrão backends: 8000-8999)
PORT=8003
NODE_ENV=development

# AvAdmin API - Backend AvAdmin roda na porta 8000
AVADMIN_INTERNAL_API_URL=http://avelarsys-avadmin-backend:8000/api/internal

# CORS - Frontend na porta 3003
CORS_ORIGINS=http://localhost:3003,https://axcellos.avelarcompany.com.br
```

### Conexão com AvAdmin
- **API Interna**: `http://avelarsys-avadmin-backend:8000/api/internal`
- **Validação de Token**: Endpoint `/validate-token`
- **Dados do Usuário**: Endpoint `/user/{cpf}`
- **Dados do Cliente**: Endpoint `/customer/{cpf_cnpj}`

## 🗂️ Estrutura do Projeto

```
AxCellOS/
├── server/                    # Backend Node.js
│   ├── src/
│   │   ├── lib/              # Utilitários e configurações
│   │   ├── db/               # Schema e conexão do banco
│   │   ├── routers/          # APIs tRPC
│   │   ├── middleware/       # CORS, autenticação
│   │   └── server.ts         # Servidor Express
│   ├── drizzle/              # Migrations
│   └── package.json
├── client/                    # Frontend React
│   ├── src/
│   │   ├── _core/hooks/      # Hooks customizados
│   │   ├── components/       # Componentes UI
│   │   ├── pages/            # Páginas da aplicação
│   │   └── lib/              # Utilitários
│   └── package.json
├── docker-compose.yml         # Infraestrutura
└── supabase/init.sql         # Inicialização do banco
```

## 🔍 Próximos Passos

### Funcionalidades Pendentes
- [ ] **WhatsApp Integration**: API do WhatsApp Business
- [ ] **Relatórios**: Sistema de relatórios avançados
- [ ] **Notificações Push**: Firebase Cloud Messaging
- [ ] **Sincronização Offline**: IndexedDB + Service Workers
- [ ] **Geolocalização**: Para entregas e rotas

### Melhorias Técnicas
- [ ] **Testes**: Jest + Testing Library
- [ ] **Documentação API**: OpenAPI/Swagger
- [ ] **Monitoramento**: Logs estruturados, métricas
- [ ] **Cache**: Redis para performance
- [ ] **Validação Zod**: Schemas completos para todas as APIs

## 📈 Status do Projeto

- ✅ **Backend Core**: Implementado e funcionando
- ✅ **Frontend Core**: Implementado e funcionando
- ✅ **Autenticação**: Integrada com AvAdmin
- ✅ **Banco de Dados**: Schema criado e populado
- ✅ **Multi-tenancy**: Implementado
- ✅ **Infraestrutura**: Docker Compose configurado

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verificar logs do container
docker logs avelarsys-axcellos-backend

# Verificar se porta 8003 está livre
netstat -tlnp | grep 8003
```

### Erro de conexão com banco
```bash
# Verificar se Supabase está rodando
docker ps | grep supabase

# Testar conexão
psql 'postgresql://supabase_admin:xxx@127.0.0.1:5433/postgres?options=-csearch_path%3Davelar_axcellos'
```

### Problemas de autenticação
```bash
# Verificar se AvAdmin está acessível
curl http://avelarsys-avadmin-backend:8000/health

# Verificar logs do backend AxCellOS
docker logs avelarsys-axcellos-backend
```

---

**Desenvolvido por AvelarSys** 🚀