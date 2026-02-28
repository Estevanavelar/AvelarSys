# ⛽ NaldoGás - Sistema de Gestão para Depósitos de Gás

**Módulo do AvelarSys** - Sistema completo de gestão para depósitos e distribuidoras de gás.

## 🎯 Sobre o Módulo

O **NaldoGás** é um módulo SaaS especializado para gestão completa de depósitos de gás, incluindo:

- 💰 **PDV Completo** com vasilhames automáticos
- 📦 **Gestão de Estoque + Vasilhames** unificada
- 💵 **Sistema de Caixa** (abertura/fechamento)
- 🛒 **E-commerce (Catálogo Público)** para pedidos online
- 🚚 **Gestão de Entregas** com rastreamento
- 👥 **Gestão de Clientes** com histórico
- 📊 **Dashboard em Tempo Real**
- 💳 **Sistema de Cupons**
- 📱 **Integração WhatsApp** (própria do módulo)

## 🏗️ Arquitetura

### Backend
- **Framework**: Express + tRPC
- **Banco de Dados**: PostgreSQL (porta 5435)
- **ORM**: Drizzle
- **Autenticação**: JWT (integrado com AvAdmin)
- **Porta**: 8004

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Porta**: 3004

## 🚀 Como Rodar (Desenvolvimento)

### Pré-requisitos
- Docker e Docker Compose
- Node.js 22+
- pnpm

### Iniciar o Módulo

```bash
# A partir da raiz do AvelarSys
docker-compose up naldogas-backend naldogas-frontend postgres-naldogas
```

### Acessar

- **Frontend**: http://localhost:3004
- **Backend API**: http://localhost:8004
- **Database**: localhost:5435

## 📦 Funcionalidades Implementadas

### ✅ Completas
- [x] PDV com vasilhames automáticos
- [x] Gestão de Estoque + Vasilhames
- [x] Sistema de Caixa
- [x] E-commerce (Catálogo Público)
- [x] Gestão de Entregas
- [x] Dashboard em Tempo Real
- [x] Gestão de Clientes
- [x] Sistema de Cupons
- [x] Rastreamento de vasilhames por cliente
- [x] 85 testes unitários

### 🔄 Em Desenvolvimento
- [ ] App do Entregador
- [ ] Sistema de recolhimento de valores
- [ ] Alertas automáticos
- [ ] Sistema de comissões
- [ ] Relatórios avançados

## 🔗 Integração com AvAdmin

O NaldoGás se integra com o AvAdmin para:

- **Autenticação**: Valida JWT tokens do AvAdmin
- **Multi-tenant**: Cada depósito é uma conta (`account_id`)
- **Planos**: Essencial (R$ 1.500), Profissional (R$ 2.500), Enterprise (R$ 4.500)
- **Gestão**: AvAdmin gerencia clientes, planos e pagamentos

## 🗄️ Banco de Dados

### Schema Principal

```sql
-- Todas as tabelas têm account_id para multi-tenancy
products {
  id: uuid,
  account_id: uuid,  -- Referência para AvAdmin
  name: varchar,
  price: decimal,
  ...
}

customers {
  id: uuid,
  account_id: uuid,
  name: varchar,
  ...
}

orders {
  id: uuid,
  account_id: uuid,
  customer_id: uuid,
  ...
}
```

## 📱 WhatsApp

**IMPORTANTE**: O NaldoGás tem seu **próprio sistema de WhatsApp**, independente do AvAdmin.

- Notificações de entregas
- Alertas de recolhimento
- Pedidos online
- Confirmação de entrega

## 🎯 Planos SaaS

| Plano | Preço | Funcionalidades |
|-------|-------|-----------------|
| **Essencial** | R$ 1.500/mês | PDV, Estoque, Caixa, Catálogo |
| **Profissional** | R$ 2.500/mês | Tudo + E-commerce, Entregas, WhatsApp |
| **Enterprise** | R$ 4.500/mês | Tudo + Múltiplas filiais, API, NF-e |

## 🔧 Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL=postgresql://naldogas_user:password@postgres-naldogas:5432/naldogas

# Autenticação
JWT_SECRET=shared-secret-with-avadmin
AVADMIN_API_URL=http://avadmin-backend:8000

# WhatsApp (próprio do módulo)
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id

# Ambiente
NODE_ENV=development
PORT=3000
```

## 📊 Status do Projeto

- **Versão**: 1.0.0 (Implementação Básica)
- **Status**: 🔄 Em integração com AvelarSys
- **Próximos Passos**:
  1. Ajustar integração JWT com AvAdmin
  2. Adicionar campo `account_id` em todas as tabelas
  3. Testar multi-tenancy
  4. Implementar App do Entregador
  5. Deploy em produção

## 📝 Notas de Implementação

Esta é uma **implementação básica e crua** do módulo. Os ajustes finais para total sincronização com o AvelarSys serão feitos posteriormente:

- ✅ Estrutura de pastas criada
- ✅ Código copiado
- ✅ Docker configurado
- ⏳ Integração JWT (pendente)
- ⏳ Multi-tenancy completo (pendente)
- ⏳ Testes de integração (pendente)

## 🤝 Contribuindo

Este módulo faz parte do ecossistema AvelarSys. Para contribuir, consulte a documentação principal do AvelarSys.

---

**NaldoGás** - Transformando a gestão de depósitos de gás com tecnologia! ⛽🚀
