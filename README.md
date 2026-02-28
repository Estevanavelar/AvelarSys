# 🚀 AvelarSys - Sistema Empresarial Completo

Sistema multi-módulo para gestão empresarial com marketplace B2B, administração centralizada e monitoramento completo.

## 📋 Visão Geral

O **AvelarSys** é uma plataforma empresarial completa composta por módulos especializados:

| Módulo | Descrição | Status |
|--------|-----------|--------|
| **🏢 AvAdmin** | Sistema de administração central | ✅ Implementado |
| **📦 StockTech** | Marketplace B2B de eletrônicos | ✅ MVP Completo |
| **💰 Lucrum** | Sistema financeiro (em desenvolvimento) | 🚧 Planejado |
| **🏠 App Portal** | Portal unificado de acesso | ✅ Implementado |
| **📊 AvelarMonitor** | Sistema de monitoramento | 🔄 Integrado |

## 🎯 Funcionalidades Principais

### ✅ AvAdmin (Sistema de Administração)
- 👥 Gestão de usuários e contas
- 🔐 Autenticação JWT centralizada
- 📊 Dashboard administrativo
- 🔧 Controle de módulos e permissões
- 📈 Analytics e relatórios

### ✅ StockTech (Marketplace B2B)
- 🛒 Catálogo de produtos eletrônicos
- 💳 Checkout com confirmação manual
- 📱 Interface mobile-first responsiva
- 🔔 Notificações em tempo real (WebSocket)
- 📋 Histórico de pedidos e vendas
- 🧪 Testes automatizados
- 🚀 CI/CD com GitHub Actions

### ✅ App Portal (Portal Unificado)
- 🎯 Seleção de módulos
- 🔗 Navegação unificada
- 📱 Interface moderna
- 🔄 Redirecionamento inteligente

## 🛠️ Tecnologias Utilizadas

### Backend
- **AvAdmin**: Django + PostgreSQL
- **StockTech**: Node.js + Express + tRPC + Drizzle ORM
- **Banco**: PostgreSQL (com Neon)
- **Cache**: Redis
- **WebSocket**: ws (para notificações em tempo real)

### Frontend
- **AvAdmin**: Next.js + React
- **StockTech**: Vite + React + TypeScript
- **App Portal**: Next.js + React
- **UI**: Shadcn/ui + Tailwind CSS

### Infraestrutura
- **Containerização**: Docker & Docker Compose
- **Proxy Reverso**: Nginx
- **Monitoramento**: Health checks + logs estruturados
- **CI/CD**: GitHub Actions

## 🚀 Início Rápido

### Pré-requisitos
- Docker & Docker Compose
- 8GB RAM mínimo
- 20GB espaço em disco

### Instalação e Execução

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd AvelarSys
   ```

2. **Inicie o sistema**
   ```bash
   ./start.sh
   ```

3. **Acesse os sistemas (Portas Fixas)**
   - 🌐 **App Portal**: http://localhost:3000
   - 🔧 **AvAdmin Frontend**: http://localhost:3001
   - 🔧 **AvAdmin Backend API**: http://localhost:8000
   - 📦 **StockTech Frontend**: http://localhost:3002
   - 📦 **StockTech Backend API**: http://localhost:8002
   - 📱 **WPPConnect**: http://localhost:8003
   - 📊 **Grafana**: http://localhost:3003

### Comandos Úteis

```bash
# Iniciar sistema
./start.sh

# Parar sistema
./start.sh stop

# Ver status
./start.sh status

# Ver logs
./start.sh logs [service-name]

# Reiniciar serviços
./start.sh restart

# Limpar dados (CUIDADO!)
./start.sh clean
```

## 🔌 Configuração de Portas

O AvelarSys usa **portas fixas** para evitar conflitos. Consulte [PORTS.md](PORTS.md) para documentação completa.

### Portas de Produção (Docker)
| Serviço | Porta Externa | Porta Interna | Domínio |
|---------|---------------|---------------|---------|
| AppPortal | 3000 | 3000 | app.avelarcompany.com.br |
| AvAdmin Frontend | 3001 | 3000 | avadmin.avelarcompany.com.br |
| AvAdmin Backend | 8000 | 8000 | avadmin.avelarcompany.com.br/api |
| StockTech Frontend | 3002 | 3000 | stocktech.avelarcompany.com.br |
| StockTech Backend | 8002 | 3000 | stocktech.avelarcompany.com.br/api |
| WPPConnect | 8003 | 8003 | wppc.avelarcompany.dev.br |
| Nginx HTTP | 80 | 80 | - |
| Nginx HTTPS | 443 | 443 | - |

### Testes de Serviços
```bash
# Testar todos os serviços
./scripts/test-all-services.sh

# Verificar portas em uso
lsof -i :3000 -i :3001 -i :3002 -i :8000 -i :8002 -i :8003
```

## 📁 Estrutura do Projeto

```
AvelarSys/
├── 🏢 AvAdmin/              # Sistema de administração
│   ├── backend/            # Django API
│   └── frontend/           # Next.js admin panel
├── 📦 StockTech/           # Marketplace B2B
│   ├── client/             # Frontend React
│   ├── server/             # Backend tRPC
│   ├── drizzle/            # Database schema
│   └── docker-compose.yml
├── 🏠 AppPortal/           # Portal unificado
├── 📊 monitoring/          # Configurações Prometheus/Grafana
├── 🛠️ scripts/            # Scripts de automação
├── 🌐 nginx/              # Configurações proxy reverso
├── 📋 docs/               # Documentação
├── 🐳 docker-compose.yml   # Orquestração completa
├── 🚀 start.sh            # Script de inicialização
└── 📖 README.md
```

## 🔧 Desenvolvimento

### Configuração do Ambiente

1. **Instale dependências**
   ```bash
   # StockTech
   cd StockTech && npm install

   # AvAdmin Backend
   cd AvAdmin/backend && pip install -r requirements.txt

   # AvAdmin Frontend
   cd AvAdmin/frontend && npm install
   ```

2. **Configure variáveis de ambiente**
   ```bash
   cp docker.env .env
   # Edite .env com suas configurações
   ```

3. **Execute migrações**
   ```bash
   # StockTech
   cd StockTech && npm run db:push
   ```

### Modos de Execução

#### 🐳 Docker (Recomendado)

**Produção** (docker-compose.yml):
```bash
docker-compose up -d  # Usa configurações otimizadas para produção
```

**Desenvolvimento** (docker-compose.override.yml):
```bash
docker-compose up -d  # Mescla automaticamente com override para dev
```

O `docker-compose.override.yml` habilita:
- ✅ Hot-reload para desenvolvimento
- ✅ Volumes montados para edição de código
- ✅ Debug mode ativado
- ✅ Logs detalhados
- ✅ Ferramentas de desenvolvimento

#### 💻 Desenvolvimento Local (Sem Docker)

```bash
# StockTech
cd StockTech
npm run dev:server  # Backend na porta 3000
npm run dev:client  # Frontend na porta 5173

# AvAdmin Backend
cd AvAdmin/backend
python manage.py runserver 0.0.0.0:8000

# AvAdmin Frontend
cd AvAdmin/frontend
npm run dev  # Porta 3000

# WPPConnect
cd WPPConnect
npm start  # Porta 8003
```

**Nota**: Desenvolvimento local não é recomendado para produção. Use sempre Docker.

## 🧪 Testes

```bash
# StockTech
cd StockTech
npm test              # Executar testes
npm run test:watch    # Modo watch
npm run test:coverage # Cobertura

# AvAdmin (se aplicável)
cd AvAdmin/backend
python manage.py test
```

## 🚀 Deploy em Produção

### Com Docker (Recomendado)

```bash
# Build e deploy
docker-compose up -d --build

# Verificar saúde
curl http://your-domain/health
```

### Configuração Nginx

O sistema inclui configuração completa do Nginx para produção com:
- SSL/TLS termination
- Rate limiting
- Gzip compression
- WebSocket proxy
- Load balancing

## 📊 Monitoramento

### Health Checks
- **App Portal**: `GET /api/health`
- **AvAdmin Frontend**: `GET /api/health`
- **AvAdmin Backend**: `GET /health/`
- **StockTech Frontend**: `GET /`
- **StockTech Backend**: `GET /health`
- **WPPConnect**: `GET /api/health`
- **PostgreSQL**: Conexão automática
- **Redis**: Ping automático

### Métricas Disponíveis
- Tempo de resposta das APIs
- Taxa de erro
- Uso de memória/CPU
- Conexões WebSocket ativas
- Pedidos por hora/dia

### Testes Automatizados
```bash
# Testar todos os serviços
./scripts/test-all-services.sh

# Status dos containers
docker compose ps

# Logs de um serviço
docker compose logs <service-name>
```

## 🔒 Segurança

### Implementações
- ✅ Autenticação JWT
- ✅ Validação de entrada
- ✅ Rate limiting
- ✅ Headers de segurança
- ✅ Logs de auditoria
- ✅ Sanitização de dados

### Recomendações Produção
- Alterar chaves JWT e secrets
- Configurar HTTPS obrigatório
- Backup automático do banco
- Monitoramento 24/7
- Atualizações regulares

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código
- **Backend**: PEP 8 (Python), ESLint (JavaScript)
- **Frontend**: Prettier + ESLint
- **Commits**: Conventional Commits
- **Testes**: Cobertura mínima 70%

## 📝 Documentação

- [📖 Guia de Deployment](docs/DEPLOYMENT_GUIDE.md)
- [🏗️ Arquitetura](docs/ARCHITECTURE.md)
- [🧪 Testes](docs/TESTING.md)
- [🔧 Troubleshooting](docs/TROUBLESHOOTING.md)

## 📈 Roadmap

### Próximas Implementações
- [ ] **Lucrum**: Sistema financeiro completo
- [ ] **Mobile App**: Aplicativo React Native
- [ ] **API Gateway**: Kong ou similar
- [ ] **Microserviços**: Decomposição adicional
- [ ] **Multi-tenant**: Isolamento completo por conta

### Melhorias Planejadas
- [ ] **Analytics Avançado**: Mixpanel/Segment
- [ ] **Cache Distribuído**: Redis Cluster
- [ ] **Backup Automático**: S3 + cron
- [ ] **Load Balancing**: Nginx + múltiplas instâncias
- [ ] **CDN**: Cloudflare para assets estáticos

---

## 📊 Status Atual - Janeiro 2026

### ✅ **IMPLEMENTADO**
- **Portas Fixas**: Sistema completo com portas documentadas (PORTS.md)
- **Docker 100%**: Todos os serviços containerizados
- **Configurações Nginx**: Proxy reverso para todos os domínios
- **Testes Automatizados**: Script de validação completo
- **Desenvolvimento**: docker-compose.override.yml com hot-reload
- **Produção**: Ambiente otimizado com health checks

### 🔧 **INFRAESTRUTURA PRONTA**
- **App Portal** (porta 3000) - ✅ Funcionando
- **AvAdmin** (porta 3001/8000) - ✅ Funcionando
- **StockTech** (porta 3002/8002) - ✅ Funcionando
- **WPPConnect** (porta 8003) - ✅ Dockerfile criado
- **PostgreSQL** (porta 5433) - ✅ Supabase externo
- **Redis** (porta 6379) - ✅ Supabase externo
- **Nginx** (porta 80/443) - ✅ Configurado

### ⚠️ **VALIDAÇÃO PENDENTE**
- **Builds Docker**: Funcionam individualmente
- **Integração**: Teste completo do sistema
- **Domínios**: Configuração DNS para produção
- **SSL**: Certificados Let's Encrypt

### 🚀 **PRÓXIMOS PASSOS**
1. **Liberar portas do sistema** (80/443 em uso pelo sistema)
2. **Deploy de teste** em servidor dedicado
3. **Configurar domínios** e SSL
4. **Monitoramento** (Prometheus/Grafana)
5. **CI/CD** automatizado

---

## 🧪 Como Testar

```bash
# 1. Verificar portas disponíveis
./scripts/test-all-services.sh --check-ports

# 2. Iniciar sistema
./start.sh

# 3. Verificar status
docker compose ps

# 4. Testar endpoints
curl http://localhost:3000/api/health
curl http://localhost:8000/health/
curl http://localhost:8002/health
```

---

## 📞 Suporte

### Canais
- 📧 **Email**: suporte@avelarcompany.com.br
- 💬 **Discord**: [Servidor AvelarSys](https://discord.gg/avelarsys)
- 📋 **Issues**: [GitHub Issues](https://github.com/avelarsys/issues)

### SLA
- 🟢 **Crítico**: < 1h resposta
- 🟡 **Alto**: < 4h resposta
- 🟠 **Médio**: < 24h resposta
- 🔴 **Baixo**: < 72h resposta

## 📄 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo `LICENSE` para detalhes.

---

## 🎉 Status do Projeto

- ✅ **AvAdmin**: Completo e funcional
- ✅ **StockTech**: MVP completo com checkout, notificações e testes
- ✅ **App Portal**: Interface unificada implementada
- 🔄 **Monitoramento**: Integrado com health checks
- 🚧 **Lucrum**: Planejado para próxima fase

**Última atualização**: Janeiro 2026
**Versão**: 1.0.0

---

<p align="center">
  <strong>Desenvolvido com ❤️ pela equipe AvelarSys</strong>
</p>