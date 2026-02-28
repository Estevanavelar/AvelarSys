# NaldoGás - TODO List

## Infraestrutura e Configuração

- [x] Configurar PostgreSQL no backend (ajustar Drizzle ORM)
- [x] Atualizar variáveis de ambiente para PostgreSQL
- [ ] Executar migrações do banco de dados

## Modelo de Dados (Schema)

- [x] Criar tabela `products` (produtos: GLP 13Kg, Água 20L, acessórios)
- [x] Criar tabela `inventory` (estoque de produtos)
- [x] Criar tabela `containers` (vasilhames: cheios, vazios, em posse de clientes)
- [x] Criar tabela `customers` (clientes com nome, telefone, endereço)
- [x] Criar tabela `sales` (vendas com data, cliente, produtos, total)
- [x] Criar tabela `sales_items` (itens de cada venda)
- [x] Criar tabela `receivables` (contas a receber - fiados)
- [x] Criar tabela `payables` (contas a pagar - despesas)
- [x] Criar tabela `pending_sales` (vendas pendentes para entrega)
- [ ] Executar migrações do banco de dados com pnpm db:push

## Módulo de Venda Rápida (PDV)

- [x] Criar página de PDV com busca de produtos
- [x] Implementar carrinho de compras
- [x] Implementar cálculo automático de totais
- [x] Implementar seleção de formas de pagamento
- [x] Implementar busca de cliente (para fiados)
- [x] Implementar função de finalizar venda
- [x] Implementar baixa automática de estoque
- [x] Implementar opção de venda pendente (via Deliveries.tsx)
- [x] Otimizar interface para tablets/celulares

## Módulo de Gestão de Estoque

- [x] Criar página de listagem de produtos
- [x] Implementar cadastro de produtos (nome, preço, preço de custo)
- [x] Implementar controle de vasilhames (cheios/vazios/em posse) - Fase 3
- [x] Implementar entrada manual de estoque (via Inventory.tsx)
- [x] Implementar saída manual de estoque (via Inventory.tsx)
- [x] Implementar alertas de estoque mínimo (Dashboard + Fase 4)
- [x] Criar relatório de estoque atual (Reports.tsx + Fase 2)

## Módulo de Cadastro de Clientes (CRM)

- [x] Criar página de listagem de clientes
- [x] Implementar cadastro de cliente (nome, telefone, endereço)
- [x] Implementar busca de cliente
- [x] Implementar visualização de histórico de compras (CustomerContainers.tsx)
- [x] Implementar exibição de saldo devedor (fiados) (Financial.tsx)
- [ ] Implementar edição de dados do cliente

## Módulo Financeiro - Contas a Receber (Fiados)

- [x] Criar página de listagem de fiados
- [x] Implementar agrupamento por cliente
- [x] Implementar exibição de valor pendente e data
- [ ] Implementar função de baixa total de fiado
- [ ] Implementar função de baixa parcial de fiado
- [ ] Implementar relatório de fiados vencidos

## Módulo Financeiro - Contas a Pagar

- [x] Criar página de listagem de contas a pagar
- [x] Implementar cadastro de despesa (descrição, valor, vencimento)
- [x] Implementar marcação de despesa como paga
- [x] Implementar alertas de vencimento próximo (Dashboard)
- [x] Implementar filtro por status (pendente/pago)

## Módulo de Gestão de Funcionários

- [x] Criar página de listagem de funcionários (Employees.tsx - Fase 2)
- [x] Implementar cadastro de funcionário (nome, cargo, permissões) (Fase 2)
- [x] Implementar controle de níveis de permissão (admin/vendedor/entregador) (Fase 2)
- [x] Implementar visualização de desempenho por vendedor (Fase 2)
- [x] Implementar edição de dados do funcionário (Fase 2)

## Módulo de Vendas Pendentes

- [x] Criar página de listagem de vendas pendentes
- [x] Implementar atribuição de pedido a entregador
- [x] Implementar status de acompanhamento (pendente/em rota/entregue)
- [x] Implementar filtro por status
- [ ] Implementar filtro por entregador

## Módulo de Relatórios

- [x] Criar página de relatórios (Reports.tsx - Fase 2)
- [x] Implementar relatório de vendas por período (Fase 2)
- [x] Implementar relatório de vendas por produto (Fase 2)
- [x] Implementar relatório de vendas por forma de pagamento (Fase 2)
- [x] Implementar relatório de fluxo de caixa (entradas/saídas) (Fase 2)
- [x] Implementar relatório de vasilhames em posse de clientes (Fase 3)
- [x] Implementar relatório de desempenho por funcionário (Fase 2)

## Interface e UX

- [x] Implementar DashboardLayout com sidebar (template já tem)
- [x] Implementar navegação entre módulos
- [x] Implementar responsividade para tablets
- [x] Implementar responsividade para celulares
- [ ] Implementar tema claro/escuro (opcional)
- [ ] Testar usabilidade no PDV

## Testes

- [x] Criar testes unitários para PDV (pdv.test.ts - Fase 3)
- [x] Criar testes unitários para gestão de estoque (containers.test.ts - Fase 3)
- [x] Criar testes unitários para fiados (receivables.test.ts - Fase 3)
- [x] Criar testes unitários para contas a pagar (cashRegister.dashboard.test.ts)
- [x] Executar testes com vitest (85 testes passando - Fase 7.1)

## Deployment

- [ ] Criar checkpoint final
- [ ] Documentar instruções de deployment em VPS
- [ ] Testar em ambiente de produção


## Atualizações Recentes (Fase 2)

- [x] Criar página de Relatórios com gráficos (vendas por dia, produtos, pagamentos, fluxo de caixa)
- [x] Implementar gráficos com Recharts (BarChart, LineChart, PieChart)
- [x] Criar página de Gestão de Funcionários com CRUD
- [x] Implementar controle de desempenho por vendedor
- [x] Adicionar rotas para Relatórios e Funcionários no App.tsx
- [x] Atualizar Home com novos módulos

## Fase 3 - Controle de Vasilhames e Testes

- [x] Implementar página de Controle de Vasilhames
- [x] Adicionar rastreamento de vasilhames (cheios/vazios/em posse de clientes)
- [x] Implementar alertas de devolução vencida
- [x] Criar testes unitários com vitest para PDV (15 testes)
- [x] Criar testes unitários com vitest para Fiados (17 testes)
- [x] Validar todos os testes (33 testes passando)

## Fase 4 - Dashboard e Backend de Relatórios

- [x] Criar página Dashboard com KPIs principais
- [x] Implementar gráficos de vendas por hora
- [x] Implementar gráficos de produtos mais vendidos
- [x] Implementar lista de entregas pendentes
- [x] Adicionar alertas críticos (devoluções vencidas, estoque baixo, fiados vencidos)
- [x] Implementar resumo financeiro (entradas, fiados, contas a pagar)
- [x] Criar router de Relatórios no backend
- [x] Implementar queries para análise de vendas
- [x] Implementar queries para análise de fiados
- [x] Implementar queries para análise de vasilhames
- [x] Adicionar stubs para exportação PDF/Excel

## Próximas Melhorias

- [ ] Integrar queries de relatórios com banco de dados PostgreSQL
- [ ] Implementar backend para gestão de funcionários
- [ ] Implementar notificações em tempo real
- [ ] Implementar exportação de relatórios em PDF/Excel
- [ ] Integrar mapa para rastreamento de entregas
- [ ] Implementar sistema de backup automático
- [ ] Adicionar autenticação de dois fatores
- [ ] Implementar histórico de auditoria


## Fase 5 - Integração WhatsApp e Mapa Offline

- [x] Instalar dependências (Baileys, Leaflet, @types/leaflet)
- [x] Implementar módulo de integração com WhatsApp (Baileys)
- [x] Criar página de configuração de WhatsApp
- [x] Implementar componente de mapa offline com OpenStreetMap + Leaflet
- [x] Criar página de rastreamento de entregas com mapa
- [x] Criar router tRPC para WhatsApp
- [x] Integrar notificações via WhatsApp no sistema
- [x] Adicionar rotas para WhatsApp e Rastreamento no App.tsx
- [x] Atualizar Home com links para novos módulos

## Funcionalidades Implementadas

### WhatsApp (Baileys)
- Conexão via QR Code
- Envio de mensagens de teste
- Notificações automáticas:
  - Notificação de venda
  - Notificação de entrega
  - Alerta de fiado vencido
  - Alerta de estoque baixo
  - Alerta de devolução de vasilhame vencida
- Configuração de notificações
- Status de conexão

### Mapa Offline (OpenStreetMap + Leaflet)
- Mapa interativo centrado em Vila Velha, ES
- Marcadores customizados por tipo (entrega, cliente, depósito)
- Rastreamento de entregas em tempo real
- Sem dependência do Google Maps
- Funciona offline com dados pré-baixados
- Zoom e navegação intuitivos

### Rastreamento de Entregas
- Lista de entregas com status
- Visualização em mapa
- Detalhes de cada entrega
- Estatísticas de entregas
- Filtros por status
- Integração com WhatsApp para notificações


## Fase 6 - Notificacoes Automaticas WhatsApp e Dashboard Inicial

- [x] Remover botao de QR Code da pagina WhatsApp
- [x] Adicionar botao de conexao de WhatsApp na pagina de configuracao
- [x] Integrar envio automatico de notificacoes ao criar venda
- [ ] Integrar envio automatico de notificacoes ao atribuir entrega
- [ ] Integrar envio automatico de notificacoes ao vencer fiado
- [ ] Integrar envio automatico de notificacoes ao estoque baixo
- [ ] Integrar envio automatico de notificacoes ao vencer devolucao vasilhame
- [x] Definir Dashboard como pagina inicial do sistema
- [ ] Testar fluxo completo de notificacoes automaticas


## Fase 7 - Sistema de Vasilhames Automático e Abertura/Fechamento de Caixa

- [x] Atualizar schema do banco para adicionar controle de vasilhames por venda
- [x] Adicionar campos containerExchanged e containerOwed na tabela sales
- [x] Implementar lógica de troca automática de vasilhames no PDV
- [x] Adicionar checkbox "Cliente não trouxe vasilhame vazio" no PDV
- [x] Adicionar seleção de canal de venda (Portaria, TeleGás, WhatsApp) no PDV
- [x] Implementar busca de cliente por CPF ou telefone no PDV
- [x] Criar procedimento searchByPhoneOrCpf no router de clientes
- [x] Atualizar router de vendas para aceitar campos de vasilhame
- [ ] Adicionar tabela de abertura/fechamento de caixa (cashRegisterSessions)
- [ ] Unificar páginas de Estoque e Vasilhames em uma única interface
- [ ] Implementar Abertura de Caixa Automática (manhã)
- [ ] Implementar Fechamento de Caixa Manual com conferência física
- [ ] Criar relatório de diferenças (físico vs virtual)
- [ ] Adicionar rastreamento de vasilhames em posse de clientes
- [ ] Testar fluxo completo de venda com troca de vasilhames


## Fase 7.1 - Correções e Seed de Dados

- [x] Investigar e corrigir erro "OAuth callback failed" no banco de dados
- [x] Criar script de seed com produtos iniciais (GLP 13Kg, Água 20L, acessórios)
- [x] Criar seed de clientes de exemplo
- [x] Criar seed de estoque inicial
- [x] Configurar POSTGRES_URL para PostgreSQL do Neon
- [x] Atualizar drizzle.config.ts para PostgreSQL
- [x] Criar script de criação de ENUMs do PostgreSQL
- [x] Executar migrações no PostgreSQL do Neon
- [x] Executar script de seed para popular banco de dados
- [x] Criar testes de conexão PostgreSQL (7 testes)
- [x] Testar PDV com produtos cadastrados
- [x] Todos os 64 testes passando (100% de sucesso)


## Fase 8 - Unificação de Estoque+Vasilhames e Sistema de Caixa

- [x] Testar PDV com venda completa (cliente, produtos, vasilhames, pagamento)
- [x] Criar interface unificada de Estoque+Vasilhames com abas
- [x] Implementar aba "Produtos" (estoque atual com alertas de estoque baixo)
- [x] Implementar aba "Vasilhames" (cheios, vazios, em posse de clientes)
- [x] Adicionar controle de entrada/saída manual de estoque
- [x] Adicionar controle de entrada/saída manual de vasilhames
- [x] Implementar sistema de abertura de caixa (CashRegister.tsx)
- [x] Implementar sistema de fechamento de caixa com contagem física
- [x] Criar tabela cash_register_sessions no schema
- [x] Implementar router de caixa (cashRegister.ts)
- [x] Adicionar validação de caixa aberto antes de venda no PDV
- [x] Implementar relatório de diferenças (físico vs sistema)
- [x] Adicionar resumo de vendas por forma de pagamento no fechamento
- [x] Testar fluxo completo: abertura → vendas → fechamento
- [x] Todos os 85 testes passando (100% de sucesso)


## Fase 9 - Catálogo Público e Sistema de Cupons

- [x] Criar página pública de catálogo (sem autenticação)
- [x] Implementar listagem de produtos disponíveis
- [x] Implementar carrinho de compras público
- [x] Implementar formulário de checkout (nome, telefone, endereço)
- [x] Implementar sistema de cupons de desconto
- [x] Criar tabela de cupons (código, desconto, validade)
- [x] Criar tabela de pedidos públicos (public_orders)
- [x] Criar tabela de clientes públicos (public_customers)
- [x] Implementar validação de cupons
- [x] Implementar cálculo de desconto no carrinho
- [x] Criar router de catálogo público (publicCatalog.ts)
- [x] Criar página de gerenciamento de cupons (admin)
- [x] Criar página de gerenciamento de pedidos públicos (admin)
- [x] Implementar conversão de pedido público em venda
- [x] Adicionar rotas para Catálogo Público e Gerenciamento
- [x] Testar fluxo completo de compra pública
- [x] Todos os 85 testes passando (100% de sucesso)


## Fase 10 - Histórico de Notificações WhatsApp

- [x] Criar tabela whatsapp_notifications no schema
- [x] Implementar salvamento de notificações enviadas
- [x] Criar página de Histórico de Notificações (NotificationHistory.tsx)
- [x] Implementar listagem de notificações com filtros
- [x] Adicionar informações de status (enviado, erro)
- [x] Implementar paginação de notificações
- [x] Adicionar rota para Histórico de Notificações
- [x] Testar envio e registro de notificações
- [x] Todos os 85 testes passando (100% de sucesso)


## Fase 11 - Melhorias no PDV e Catálogo

- [x] Adicionar busca de cliente por CPF ou telefone no PDV
- [x] Implementar criação rápida de cliente no PDV
- [x] Adicionar seleção de canal de venda no PDV
- [x] Melhorar interface do catálogo público
- [x] Adicionar imagens de produtos (placeholder)
- [x] Implementar responsividade do catálogo
- [x] Adicionar validação de estoque no checkout
- [x] Implementar mensagem de sucesso após pedido
- [x] Testar fluxo completo de venda e pedido público
- [x] Todos os 85 testes passando (100% de sucesso)


## Fase 12 - Página de Pedidos (Orders) e Melhorias Finais

- [x] Criar página Orders.tsx para gerenciar pedidos públicos
- [x] Implementar listagem de pedidos com status
- [x] Implementar filtros por status (pendente, confirmado, entregue, cancelado)
- [x] Adicionar ação de converter pedido em venda
- [x] Adicionar ação de cancelar pedido
- [x] Implementar visualização de detalhes do pedido
- [x] Adicionar rota /orders no App.tsx
- [x] Atualizar Home.tsx com link para Pedidos
- [x] Testar fluxo completo de pedidos
- [x] Todos os 85 testes passando (100% de sucesso)


---

## Fase 13 - Sistema de Confirmação de Entrega com Pagamento

### 📱 App do Entregador (Página Exclusiva)

**Fluxo Principal:**
1. Entregador faz login em `/entregador` (sem acesso ao painel admin)
2. Vê lista de pedidos atribuídos a ele
3. Ao chegar no endereço, clica em "Confirmar Entrega"
4. Popup abre perguntando:
   - Forma de pagamento (Dinheiro, PIX, Cartão Crédito, Cartão Débito, Fiado)
   - Campo opcional de observações
   - Geolocalização automática (validar proximidade do endereço)
5. Sistema registra:
   - Pedido marcado como "Entregue"
   - Pagamento registrado
   - Baixa automática no caixa
   - Valor fica pendente de recolhimento pelo admin (se dinheiro)

### 💰 Sistema de Recolhimento de Valores

**Para o Admin:**
- Nova aba "Recolhimento de Valores" na página Entregas
- Lista de entregadores com valores pendentes:
  - João Silva: R$ 450,00 em dinheiro, R$ 120,00 PIX
  - Maria Santos: R$ 280,00 em dinheiro
- Botão "Recolher Valores" abre modal de confirmação
- Histórico de recolhimentos realizados

**Alertas Automáticos:**
- 🔔 18h: "Lembre-se de recolher os valores com os entregadores"
- 🔔 Fim da rota: "Entregador João finalizou as entregas. Total a recolher: R$ 450,00"
- 🔴 Badge vermelho no menu quando há valores pendentes

### 🗄️ Estrutura de Banco de Dados

**Atualizar Tabela `deliveries`:**
```sql
- paymentMethod (enum: cash, pix, credit_card, debit_card, credit)
- paidAmount (decimal)
- paidAt (timestamp)
- collectedByAdmin (boolean) - se admin já recolheu
```

**Nova Tabela `delivery_collections`:**
```sql
- id
- delivererId
- collectionDate
- totalCash (total em dinheiro recolhido)
- totalPix
- totalCard
- adminId (quem recolheu)
- notes (observações)
```

### 📋 Checklist de Implementação

- [ ] Criar página `/entregador` (EntregadorApp.tsx)
- [ ] Implementar lista de entregas do entregador logado
- [ ] Criar popup de confirmação de entrega com pagamento
- [ ] Adicionar geolocalização na confirmação
- [ ] Atualizar schema com campos de pagamento
- [ ] Criar tabela delivery_collections
- [ ] Implementar router de recolhimento
- [ ] Criar aba "Recolhimento" na página Entregas
- [ ] Implementar lista de valores pendentes por entregador
- [ ] Implementar botão "Recolher Valores"
- [ ] Criar sistema de alertas automáticos
- [ ] Adicionar badge de valores pendentes no menu
- [ ] Criar relatório de recolhimentos
- [ ] Testar fluxo completo

---

## Fase 14 - Sistema de Preços Diferenciados

### 💰 Preços por Forma de Pagamento

**Funcionalidade:** Produtos com preços diferentes para PIX/Dinheiro vs Cartão

- [x] Adicionar campos `priceCash` e `priceCard` na tabela products
- [x] Criar migration SQL para preços diferenciados
- [x] Atualizar router de produtos para aceitar novos campos
- [x] Implementar cálculo automático de preço no PDV baseado na forma de pagamento
- [x] Adicionar recalculo automático do carrinho ao mudar forma de pagamento
- [x] Melhorar visual do PDV com alertas de desconto
- [x] Atualizar exibição de preços no catálogo público

### 📊 Página de Taxas e Descontos (Futuro)

**Localização:** `/financeiro/taxas`

- [ ] Criar página de configuração de taxas
- [ ] Implementar configuração de percentual de desconto PIX/Dinheiro
- [ ] Implementar configuração de acréscimo para Cartão
- [ ] Criar botão "Recalcular Preços" para aplicar em todos os produtos
- [ ] Criar tabela de visualização de diferenças de preços
- [ ] Adicionar histórico de alterações de taxas
- [ ] Adicionar rota /financeiro/taxas no App.tsx

---

## Fase 15 - SISTEMA DE FRANQUIAS (Multi-Depósito Isolado)

### 📋 CONCEITO GERAL

Sistema modelo McDonald's onde:
- **FRANQUEADOR** (Dono da Marca NaldoGás): Vê TODAS as franquias, dashboard consolidado, recebe royalties
- **FRANQUEADO** (Dono da Franquia): Vê APENAS sua franquia, tem todos os módulos completos
- **GERENTE/VENDEDOR/ENTREGADOR**: Acesso apenas à sua franquia, funções operacionais

Cada franquia tem o sistema COMPLETO (PDV, Estoque, Clientes, Financeiro, Entregas, Relatórios, etc.) funcionando de forma INDEPENDENTE.

---

### 🗄️ ESTRUTURA DE BANCO DE DADOS

#### Nova Tabela: `branches` (Franquias/Depósitos)
```sql
CREATE TABLE branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,              -- "Vila Velha", "Poça da Fruta", "Serra"
  franchise_code VARCHAR(50) UNIQUE,       -- "NG-VV-001", "NG-PF-002", "NG-SE-003"
  franchisee_name VARCHAR(255),            -- Nome do franqueado
  franchisee_cpf VARCHAR(14),              -- CPF do franqueado
  franchisee_phone VARCHAR(20),            -- Telefone do franqueado
  franchisee_email VARCHAR(320),           -- Email do franqueado
  address TEXT,                            -- Endereço da franquia
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),                       -- Telefone da franquia
  email VARCHAR(320),                      -- Email da franquia
  manager_id INTEGER REFERENCES users(id), -- Gerente da franquia
  royalty_percentage DECIMAL(5,2) DEFAULT 5.00,  -- % de royalty (ex: 5%)
  is_active BOOLEAN DEFAULT true,
  opened_at DATE,                          -- Data de abertura da franquia
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Nova Tabela: `franchise_fees` (Royalties)
```sql
CREATE TABLE franchise_fees (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  month DATE NOT NULL,                     -- Mês de referência (ex: 2024-01-01)
  revenue DECIMAL(10,2) NOT NULL,          -- Faturamento da franquia no mês
  royalty_percentage DECIMAL(5,2) NOT NULL, -- % de royalty aplicado
  royalty_amount DECIMAL(10,2) NOT NULL,   -- Valor do royalty (revenue * %)
  paid BOOLEAN DEFAULT false,              -- Se foi pago
  paid_at TIMESTAMP,                       -- Data do pagamento
  payment_method VARCHAR(50),              -- Forma de pagamento do royalty
  notes TEXT,                              -- Observações
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_franchise_fees_branch ON franchise_fees(branch_id);
CREATE INDEX idx_franchise_fees_month ON franchise_fees(month);
```

#### Atualizar Tabela: `users`
```sql
ALTER TABLE users ADD COLUMN branch_id INTEGER REFERENCES branches(id);
ALTER TABLE users DROP COLUMN role; -- Remover enum antigo
ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';

-- Roles possíveis:
-- 'franchisor'      - Franqueador (dono da marca, vê tudo)
-- 'franchisee'      - Franqueado (dono da franquia, vê apenas sua franquia)
-- 'branch_manager'  - Gerente da franquia
-- 'vendor'          - Vendedor
-- 'deliverer'       - Entregador
-- 'user'            - Usuário comum (deprecated)
```

#### Adicionar `branch_id` em TODAS as tabelas existentes
```sql
-- Produtos por franquia
ALTER TABLE products ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_products_branch ON products(branch_id);

-- Estoque por franquia
ALTER TABLE inventory ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);

-- Vasilhames por franquia
ALTER TABLE containers ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_containers_branch ON containers(branch_id);

-- Clientes por franquia
ALTER TABLE customers ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_customers_branch ON customers(branch_id);

-- Vendas por franquia
ALTER TABLE sales ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_sales_branch ON sales(branch_id);

-- Itens de venda (herda branch_id da venda)
-- Não precisa adicionar branch_id, pega via JOIN com sales

-- Contas a receber (fiados) por franquia
ALTER TABLE receivables ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_receivables_branch ON receivables(branch_id);

-- Contas a pagar por franquia
ALTER TABLE payables ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_payables_branch ON payables(branch_id);

-- Entregas por franquia
ALTER TABLE deliveries ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_deliveries_branch ON deliveries(branch_id);

-- Caixa por franquia
ALTER TABLE cash_register_sessions ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_cash_register_branch ON cash_register_sessions(branch_id);

-- Catálogo público - clientes por franquia
ALTER TABLE public_customers ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_public_customers_branch ON public_customers(branch_id);

-- Catálogo público - pedidos por franquia
ALTER TABLE public_orders ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_public_orders_branch ON public_orders(branch_id);

-- Cupons por franquia
ALTER TABLE coupons ADD COLUMN branch_id INTEGER REFERENCES branches(id);
CREATE INDEX idx_coupons_branch ON coupons(branch_id);
```

---

### 🔐 CONTROLE DE PERMISSÕES (Middleware)

#### Arquivo: `server/middleware/branch-filter.ts`
```typescript
import { TRPCError } from "@trpc/server";
import { Context } from "../_core/context";

export const getBranchFilter = (ctx: Context) => {
  const user = ctx.user;
  
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // FRANQUEADOR: Vê todas as franquias
  if (user.role === "franchisor") {
    return {}; // Sem filtro, vê tudo
  }

  // FRANQUEADO, GERENTE, VENDEDOR, ENTREGADOR: Vê apenas sua franquia
  if (!user.branch_id) {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Usuário não está associado a nenhuma franquia" 
    });
  }

  return { branch_id: user.branch_id };
};

// Procedimento protegido com filtro de franquia
export const branchProtectedProcedure = protectedProcedure.use(({ ctx, next }) => {
  const branchFilter = getBranchFilter(ctx);
  return next({
    ctx: {
      ...ctx,
      branchFilter, // Disponível em todos os procedimentos
    },
  });
});
```

#### Atualizar TODOS os routers para usar `branchFilter`

**Exemplo - products.ts:**
```typescript
list: branchProtectedProcedure.query(async ({ ctx }) => {
  return db.products.findMany({
    where: ctx.branchFilter, // Filtra por franquia automaticamente
  });
}),

create: branchProtectedProcedure
  .input(...)
  .mutation(async ({ input, ctx }) => {
    return db.products.create({
      data: {
        ...input,
        branch_id: ctx.user.branch_id, // Adiciona branch_id automaticamente
      },
    });
  }),
```

**Aplicar o mesmo padrão em:**
- `products.ts`
- `inventory.ts`
- `containers.ts`
- `customers.ts`
- `sales.ts`
- `receivables.ts` (fiados)
- `payables.ts` (contas a pagar)
- `deliveries.ts`
- `cashRegister.ts`
- `publicCatalog.ts`
- `coupons.ts`
- `reports.ts`
- `dashboard.ts`

---

### 📊 FUNCIONALIDADES POR TIPO DE USUÁRIO

#### 1. FRANQUEADOR (Dono da Marca)

**Dashboard Consolidado:**
- [ ] Criar `pages/FranchisorDashboard.tsx`
- [ ] KPIs consolidados:
  - Faturamento total de todas as franquias
  - Número de franquias ativas
  - Total de vendas do dia/mês
  - Crescimento geral
- [ ] Ranking de franquias por desempenho
- [ ] Gráfico de faturamento por franquia
- [ ] Mapa de franquias (opcional)

**Gestão de Franquias:**
- [ ] Criar `pages/FranchiseManagement.tsx`
- [ ] Listar todas as franquias
- [ ] Criar nova franquia
- [ ] Editar dados da franquia
- [ ] Ativar/desativar franquia
- [ ] Ver detalhes de cada franquia

**Sistema de Royalties:**
- [ ] Criar `pages/RoyaltiesManagement.tsx`
- [ ] Calcular royalties automaticamente (job mensal)
- [ ] Listar royalties por franquia
- [ ] Marcar royalty como pago
- [ ] Relatório de inadimplência
- [ ] Histórico de pagamentos

**Auditoria:**
- [ ] Seletor de franquia no header
- [ ] Ao selecionar uma franquia, pode ver TODOS os módulos daquela franquia
- [ ] Botão "Ver como Franqueado" para simular acesso

**Relatórios Comparativos:**
- [ ] Comparativo de vendas entre franquias
- [ ] Produtos mais vendidos por franquia
- [ ] Desempenho de vendedores por franquia
- [ ] Análise de crescimento por franquia

#### 2. FRANQUEADO (Dono da Franquia)

**Todos os módulos atuais, mas vendo APENAS sua franquia:**
- [ ] PDV (Venda Rápida)
- [ ] Estoque (Produtos + Vasilhames)
- [ ] Clientes (CRM)
- [ ] Financeiro (Caixa, Fiados, Contas a Pagar)
- [ ] Entregas (Rastreamento)
- [ ] Relatórios
- [ ] Funcionários
- [ ] WhatsApp
- [ ] Catálogo Público
- [ ] Dashboard

**Módulo Financeiro - Aba Royalties:**
- [ ] Criar `pages/FranchiseeRoyalties.tsx`
- [ ] Ver royalties a pagar
- [ ] Histórico de pagamentos
- [ ] Gerar boleto/comprovante (futuro)

**Badge no Header:**
- [ ] Mostrar nome da franquia no header
- [ ] Ex: "🏪 Franquia Vila Velha"

#### 3. GERENTE/VENDEDOR/ENTREGADOR

**Acesso aos módulos operacionais da sua franquia:**
- [ ] Gerente: Acesso completo aos módulos da franquia
- [ ] Vendedor: PDV, Clientes, Estoque (visualização)
- [ ] Entregador: Entregas, Rastreamento

**Badge no Header:**
- [ ] Mostrar nome da franquia
- [ ] Mostrar função (Gerente, Vendedor, Entregador)

---

### 🚀 IMPLEMENTAÇÃO - CHECKLIST COMPLETO

#### FASE 1: Banco de Dados (2-3 dias)
- [ ] Criar migration para tabela `branches`
- [ ] Criar migration para tabela `franchise_fees`
- [ ] Criar migration para adicionar `branch_id` em users
- [ ] Criar migration para adicionar `branch_id` em products
- [ ] Criar migration para adicionar `branch_id` em inventory
- [ ] Criar migration para adicionar `branch_id` em containers
- [ ] Criar migration para adicionar `branch_id` em customers
- [ ] Criar migration para adicionar `branch_id` em sales
- [ ] Criar migration para adicionar `branch_id` em receivables
- [ ] Criar migration para adicionar `branch_id` em payables
- [ ] Criar migration para adicionar `branch_id` em deliveries
- [ ] Criar migration para adicionar `branch_id` em cash_register_sessions
- [ ] Criar migration para adicionar `branch_id` em public_customers
- [ ] Criar migration para adicionar `branch_id` em public_orders
- [ ] Criar migration para adicionar `branch_id` em coupons
- [ ] Criar indexes para otimizar queries por branch_id
- [ ] Executar migrations: `pnpm db:push`
- [ ] Criar seed com 3 franquias de exemplo (Vila Velha, Poça da Fruta, Serra)
- [ ] Criar seed com usuários de exemplo (franqueador, franqueados, gerentes)

#### FASE 2: Backend - Middleware e Filtros (2 dias)
- [ ] Criar `server/middleware/branch-filter.ts`
- [ ] Criar `branchProtectedProcedure` no tRPC
- [ ] Atualizar context.ts para incluir `branchFilter`
- [ ] Testar middleware com diferentes roles

#### FASE 3: Backend - Atualizar Routers (3-4 dias)
- [ ] Atualizar `routers/products.ts` com branchFilter
- [ ] Atualizar `routers/inventory.ts` com branchFilter
- [ ] Atualizar `routers/containers.ts` com branchFilter
- [ ] Atualizar `routers/customers.ts` com branchFilter
- [ ] Atualizar `routers/sales.ts` com branchFilter
- [ ] Atualizar `routers/financial.ts` com branchFilter
- [ ] Atualizar `routers/deliveries.ts` com branchFilter
- [ ] Atualizar `routers/cashRegister.ts` com branchFilter
- [ ] Atualizar `routers/publicCatalog.ts` com branchFilter
- [ ] Atualizar `routers/reports.ts` com branchFilter
- [ ] Atualizar `routers/dashboard.ts` com branchFilter
- [ ] Criar `routers/branches.ts` (CRUD de franquias)
- [ ] Criar `routers/royalties.ts` (gestão de royalties)

#### FASE 4: Backend - Helpers (1 dia)
- [ ] Criar `db-helpers.ts` para branches (getBranches, createBranch, updateBranch, etc.)
- [ ] Criar `db-helpers.ts` para royalties (calculateRoyalties, getRoyaltiesByBranch, etc.)
- [ ] Criar helper para calcular royalties automaticamente
- [ ] Criar helper para gerar relatório consolidado

#### FASE 5: Frontend - Dashboard do Franqueador (2-3 dias)
- [ ] Criar `pages/FranchisorDashboard.tsx`
- [ ] Implementar KPIs consolidados
- [ ] Implementar ranking de franquias
- [ ] Implementar gráficos comparativos
- [ ] Implementar seletor de franquia no header
- [ ] Criar `pages/FranchiseManagement.tsx` (CRUD de franquias)
- [ ] Criar `pages/RoyaltiesManagement.tsx` (gestão de royalties)

#### FASE 6: Frontend - Adaptações para Franqueados (2 dias)
- [ ] Adicionar badge de franquia no header
- [ ] Criar `pages/FranchiseeRoyalties.tsx` (ver royalties a pagar)
- [ ] Adaptar Dashboard para mostrar apenas dados da franquia
- [ ] Testar todos os módulos com filtro de franquia

#### FASE 7: Frontend - Controle de Permissões (1 dia)
- [ ] Implementar controle de rotas por role
- [ ] Ocultar módulos não permitidos para cada role
- [ ] Criar página de "Acesso Negado"
- [ ] Testar permissões de cada role

#### FASE 8: Testes (2-3 dias)
- [ ] Criar testes unitários para branch-filter middleware
- [ ] Criar testes unitários para routers com branchFilter
- [ ] Criar testes de integração para fluxo completo de franquia
- [ ] Testar isolamento de dados entre franquias
- [ ] Testar cálculo de royalties
- [ ] Testar dashboard consolidado do franqueador
- [ ] Executar todos os testes: `pnpm test`

#### FASE 9: Documentação (1 dia)
- [ ] Documentar arquitetura de franquias no README
- [ ] Documentar roles e permissões
- [ ] Documentar fluxo de cálculo de royalties
- [ ] Criar guia de uso para franqueador
- [ ] Criar guia de uso para franqueado

#### FASE 10: Deploy e Validação (1 dia)
- [ ] Fazer backup do banco de dados
- [ ] Executar migrations em produção
- [ ] Testar sistema em produção
- [ ] Validar isolamento de dados
- [ ] Salvar checkpoint final

---

### 💡 FUNCIONALIDADES EXTRAS (Futuro)

#### Transferência de Estoque entre Franquias
- [ ] Criar tabela `stock_transfers`
- [ ] Implementar solicitação de transferência
- [ ] Implementar aprovação de transferência
- [ ] Atualizar estoque de ambas as franquias

#### Padrões Globais (Franqueador define)
- [ ] Preços sugeridos de produtos
- [ ] Produtos obrigatórios em todas as franquias
- [ ] Configurações de WhatsApp padrão
- [ ] Templates de mensagens padrão

#### Relatórios Avançados
- [ ] Análise de sazonalidade por franquia
- [ ] Previsão de demanda por franquia
- [ ] Comparativo de lucratividade
- [ ] ROI por franquia

#### Gamificação
- [ ] Sistema de metas por franquia
- [ ] Prêmios para franquias com melhor desempenho
- [ ] Ranking mensal/anual

---

### 📝 OBSERVAÇÕES IMPORTANTES

1. **Isolamento de Dados:** NUNCA permitir que uma franquia veja dados de outra (exceto franqueador)
2. **Performance:** Criar indexes em TODOS os campos `branch_id` para otimizar queries
3. **Auditoria:** Registrar TODAS as ações do franqueador ao acessar dados de franquias
4. **Backup:** Cada franquia deve ter backup independente (ou backup com separação lógica)
5. **Migração de Dados:** Ao implementar, migrar dados existentes para a franquia "Matriz" (branch_id = 1)
6. **Testes:** Testar EXAUSTIVAMENTE o isolamento de dados antes de deploy em produção

---

### 🎯 TEMPO ESTIMADO DE IMPLEMENTAÇÃO

**Total: 15-20 dias de desenvolvimento**

- Fase 1: 2-3 dias
- Fase 2: 2 dias
- Fase 3: 3-4 dias
- Fase 4: 1 dia
- Fase 5: 2-3 dias
- Fase 6: 2 dias
- Fase 7: 1 dia
- Fase 8: 2-3 dias
- Fase 9: 1 dia
- Fase 10: 1 dia

---

### ✅ PRIORIDADE

**ALTA** - Funcionalidade estratégica para expansão do negócio via modelo de franquias.

---


## 📋 REORGANIZAÇÕES FUTURAS DE INTERFACE

### 1. Integrar Rastreamento em Entregas (3 abas)
- [ ] Mover página `/rastreamento` para dentro de `/entregas`
- [ ] Criar estrutura de abas em Entregas:
  - 📦 **Pedidos** (lista de pedidos, atribuição de entregadores)
  - 🗺️ **Rastreamento** (mapa com entregas em tempo real)
  - 💰 **Recolhimento** (valores pendentes dos entregadores)
- [ ] Atualizar navegação e remover item separado do menu

### 2. Integrar Notificações em WhatsApp (3 abas)
- [ ] Mover página `/notifications` para dentro de `/whatsapp`
- [ ] Criar estrutura de abas em WhatsApp:
  - ⚙️ **Configurações** (conectar WhatsApp, templates)
  - 📨 **Notificações** (histórico de mensagens enviadas)
  - 📊 **Estatísticas** (taxa de entrega, mensagens por tipo)
- [ ] Atualizar navegação e remover item separado do menu

### 3. Integrar Caixa em Financeiro (3 abas)
- [ ] Mover página `/caixa` para dentro de `/financeiro`
- [ ] Criar estrutura de abas em Financeiro:
  - 💵 **Caixa** (abertura, fechamento, contagem física)
  - 📝 **Fiados** (contas a receber, cobranças)
  - 📤 **Contas a Pagar** (despesas, fornecedores)
- [ ] Atualizar navegação e remover item separado do menu

**Resultado:** Menu lateral mais limpo (de 12 itens → 9 itens)

---
