# 🚀 Implementação do Backend - Progresso

Este arquivo será atualizado conforme você fornece informações e eu vou implementando.

## 📊 Status Geral

- **Estrutura Base**: ⏳ Aguardando informações
- **Configuração**: ✅ Informações recebidas
- **Banco de Dados**: ✅ Estratégia definida
- **Autenticação**: ✅ Estratégia definida
- **Routers**: ⏳ Aguardando informações
- **Integrações**: ⏳ Aguardando informações

---

## 📝 Informações Recebidas

### ✅ Banco de Dados
- **Autenticação**: Sistema AvAdmin via API + Banco Neon
- **Dados do Sistema**: Schema `avelar_axcellos` no Supabase self-hosted
- **Tipo**: PostgreSQL (Supabase)
- **Schema**: `avelar_axcellos` (criar no Supabase)

### ✅ Integração AvAdmin - Clientes
- **Clientes são EXTERNOS**: Gerenciados exclusivamente no AvAdmin (Neon)
- **Buscar cliente**: Sistema busca do AvAdmin apenas: ID, Nome completo, CPF, WhatsApp (em tempo real)
- **Cadastrar cliente**: Sistema envia para AvAdmin: ID (mesmo número do CPF), Nome completo, WhatsApp
  - AvAdmin cria o cliente automaticamente
  - Sistema recebe o ID retornado pelo AvAdmin
- **Armazenamento local**: Apenas o `customerId` é armazenado (referência externa)
- **Sem cache**: Dados do cliente são buscados em tempo real do AvAdmin quando necessário

### ⏳ Configurações Pendentes
- [ ] URL de conexão do Supabase self-hosted
- [ ] Credenciais do Supabase (usuário/senha ou connection string)
- [ ] URL da API do AvAdmin
- [ ] Credenciais/Token da API do AvAdmin
- [ ] Variáveis de ambiente necessárias
- [ ] Configurações de WhatsApp
- [ ] Configurações de Storage (S3)

### ⏳ Estrutura e Arquitetura
- [ ] Preferências de framework (Express/Fastify)
- [ ] Estrutura de pastas desejada
- [ ] Padrões de código

---

## 🗄️ Arquitetura de Banco de Dados

### Autenticação (AvAdmin + Neon)
- **Sistema**: AvAdmin via API
- **Banco**: Neon (gerenciado pelo AvAdmin)
- **Uso**: Apenas para autenticação de usuários
- **Integração**: Via API REST do AvAdmin

### Dados do Sistema (Supabase Self-hosted)
- **Banco**: Supabase PostgreSQL self-hosted
- **Schema**: `avelar_axcellos`
- **Tabelas a criar**:
  - `customers` - Clientes
  - `serviceOrders` - Ordens de serviço
  - `serviceOrderHistory` - Histórico de ordens
  - `products` - Produtos
  - `sales` - Vendas
  - `saleItems` - Itens de venda
  - `whatsappMessages` - Mensagens WhatsApp

### Migração Necessária
- ⚠️ **IMPORTANTE**: Schema atual está em MySQL, precisa ser convertido para PostgreSQL
- Converter tipos MySQL → PostgreSQL:
  - `int()` → `serial()` ou `integer()`
  - `mysqlEnum()` → `pgEnum()` ou `varchar()` com constraint
  - `mysqlTable()` → `pgTable()`
  - `decimal()` → `numeric()` ou `decimal()`
  - `timestamp()` → `timestamp()` (similar)
  - `text()` → `text()` (similar)
  - `varchar()` → `varchar()` (similar)
  - `boolean()` → `boolean()` (similar)

---

## 🔐 Autenticação

### Estratégia: AvAdmin API
- **Método**: Integração via API REST do AvAdmin
- **Fluxo**:
  1. Frontend redireciona para AvAdmin OAuth
  2. AvAdmin retorna token/sessão
  3. Backend valida token com API do AvAdmin
  4. Backend obtém dados do usuário do AvAdmin
  5. Backend gerencia sessão localmente (cookies)

### Endpoints Necessários
- `auth.me` - Validar token com AvAdmin API e retornar usuário
- `auth.logout` - Invalidar sessão local
- Middleware de autenticação que valida token com AvAdmin

### Informações Necessárias
- [ ] URL base da API do AvAdmin
- [ ] Endpoint de validação de token
- [ ] Endpoint de obtenção de dados do usuário
- [ ] Método de autenticação (Bearer token, API key, etc.)
- [ ] Formato da resposta da API

---

## ✅ Implementações Concluídas

- ✅ **Schema PostgreSQL completo criado** (`drizzle/schema.ts`)
  - Convertido de MySQL para PostgreSQL
  - Foco em: PDV, Configurações, Ordem de Serviço, Estoque
  - Clientes gerenciados no AvAdmin (Neon) - apenas referência por ID
  - WhatsApp removido (não implementar por enquanto)
  - Campos de endereço removidos (apenas CPF, nome, WhatsApp nos dados de cache)
  - Relações entre tabelas definidas (`drizzle/relations.ts`)
  - Configuração do Drizzle atualizada para PostgreSQL (`drizzle.config.ts`)

---

## 🔄 Em Andamento

- ✅ Planejamento da arquitetura de banco de dados
- ✅ Definição da estratégia de autenticação

---

## 📋 Próximos Passos

1. ✅ Receber informações sobre banco de dados e autenticação
2. ⏳ Aguardar URL e credenciais do Supabase
3. ⏳ Aguardar informações da API do AvAdmin
4. ⏳ Converter schema MySQL → PostgreSQL
5. ⏳ Criar estrutura base do backend
6. ⏳ Configurar conexão com Supabase (schema avelar_axcellos)
7. ⏳ Implementar autenticação via AvAdmin API
8. ⏳ Implementar routers tRPC
9. ⏳ Configurar Docker Compose

---

## 📌 Notas Importantes

1. **Schema MySQL → PostgreSQL**: O schema atual precisa ser convertido antes de criar as tabelas no Supabase
2. **Autenticação Externa**: Não vamos criar tabela `users` local, vamos usar AvAdmin
3. **Schema Separado**: Dados do sistema ficam em `avelar_axcellos`, autenticação no AvAdmin/Neon
4. **Supabase Self-hosted**: Precisamos da URL de conexão e credenciais

---

**Última atualização**: Informações de banco de dados e autenticação recebidas
