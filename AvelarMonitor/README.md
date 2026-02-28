# Painel de Controle AvelarMonitor

Painel de controle completo e otimizado em Django para gerenciamento e monitoramento do servidor AvelarSys.

## 🚀 Status: TOTALMENTE FUNCIONAL E OTIMIZADO

✅ **Todas as funcionalidades testadas e funcionando**
✅ **Configurações de produção aplicadas**
✅ **Performance otimizada**
✅ **Scripts de gerenciamento automatizados**

## Funcionalidades

### Painel Local (AvelarMonitor)
- **Dashboard**: Visão geral do sistema com métricas principais
- **Monitoramento**: CPU, memória, disco, rede e processos
- **Gerenciador de Arquivos**: Navegação, upload, download, edição e exclusão de arquivos
- **Gerenciamento Docker**: Listar, controlar e monitorar containers Docker
- **Gerenciamento DNS**: Gerenciar domínios e registros DNS (com suporte Cloudflare)
- **API Keys**: Gerenciar API keys do sistema com segurança
- **Crons**: Agendamento de tarefas automatizadas

### Multi-Servidor (Novo)
- **Monitoramento Centralizado**: Monitorar múltiplas VPS de um único painel
- **Agent Remoto**: Agent leve que coleta métricas em tempo real
- **WebSocket**: Conexão em tempo real para atualizações instantâneas
- **Servidores**: Gerenciar múltiplos servidores com grupos e tags
- **Métricas Históricas**: Armazenamento de métricas com downsampling
- **Alertas**: Regras personalizadas de alerta com múltiplos canais de notificação
- **Deploy Git**: Deploy automatizado via Git com rollback
- **Backups**: Backups automatizados de banco de dados, arquivos e Docker volumes
- **Terminal Web**: Terminal remoto via WebSocket
- **API REST**: API completa para automação

## Requisitos

### Painel Local
- Python 3.8+
- Django 4.2+
- Acesso ao Docker (para gerenciamento de containers)
- Permissões adequadas para monitoramento do sistema

### Multi-Servidor
- Python 3.8+ (em cada VPS)
- Redis (para WebSocket)
- Docker (opcional, para monitoramento de containers)
- psutil, requests, websockets (em cada VPS)

## Instalação

### 🐳 Via Docker (Recomendado - Produção)

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Edite as variáveis importantes:

```bash
nano .env
```

```env
SECRET_KEY=$(openssl rand -base64 32)
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,seu-dominio.com
APP_PORT=9999
DJANGO_SUPERUSER_PASSWORD=sua_senha_segura
```

3. Inicie os containers:

```bash
docker compose up -d
```

4. Acesse o sistema:

- **Painel**: http://localhost:9999
- **Admin**: http://localhost:9999/admin

### 💻 Via Python (Desenvolvimento)

1. Instale as dependências:

```bash
cd /home/avelarsys/AvelarSys/AvelarMonitor
pip install -r requirements.txt
```

2. Configure o Redis (necessário para WebSocket):

```bash
sudo apt install redis-server
sudo systemctl start redis
```

3. Execute as migrações:

```bash
python manage.py migrate
```

4. Crie um superusuário:

```bash
python manage.py createsuperuser
```

5. Execute o servidor com ASGI (WebSocket):

```bash
daphne painel_control.asgi:application -b 0.0.0.0 -p 9999
```

### Agent (nas VPS)

1. Copie o agent.py para a VPS:

```bash
scp /home/avelarsys/AvelarSys/AvelarMonitor/agent.py user@vps:/home/user/
```

2. Instale dependências na VPS:

```bash
pip3 install psutil requests websockets docker
```

3. Crie um token no painel Django:

```bash
python manage.py shell
>>> from apps.multi.models import AgentToken
>>> token = AgentToken.objects.create(name="VPS-Production")
>>> print(token.token)
>>> exit()
```

4. Execute o agent na VPS:
 
 ```bash
 python3 agent.py --server http://SEU_PAINEL_IP:9999 --token SEU_TOKEN
 ```

5. Instale como serviço (opcional):

```bash
sudo cp agent.py /usr/local/bin/omnimonitor-agent
sudo chmod +x /usr/local/bin/omnimonitor-agent

# Criar systemd service
sudo tee /etc/systemd/system/omnimonitor-agent.service > /dev/null <<EOF
[Unit]
Description=OmniMonitor Agent
After=network.target

[Service]
Type=simple
User=avelarsys
WorkingDirectory=/home/avelarsys
ExecStart=/usr/bin/python3 /usr/local/bin/omnimonitor-agent --server http://SEU_PAINEL_IP:9999 --token SEU_TOKEN
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable omnimonitor-agent
sudo systemctl start omnimonitor-agent
```

## Acesso

### Docker
Acesse o painel em: `http://localhost:9999`

### Python
Acesse o painel em: `http://localhost:9999`

**Credenciais de Acesso:**
- **Usuário:** AvelarComp
- **Senha:** @Acompany0605

## 🚀 Inicialização Automática

**✅ CONFIGURADO: O painel inicia automaticamente no boot e reinicia em caso de falha!**

### Como Funciona
- **Boot do Sistema**: Script executado automaticamente 30 segundos após o boot
- **Monitoramento Contínuo**: Verificação a cada minuto se o painel está funcionando
- **Auto-recuperação**: Reinício automático se o servidor parar ou não responder
- **Logs Detalhados**: Registro completo de todas as ações em `logs/monitor.log`

### Scripts de Gerenciamento

- `./start-production.sh` - Inicia o servidor manualmente (background)
- `./stop-production.sh` - Para o servidor graciosamente
- `./status.sh` - Verifica status completo do sistema
- `./setup.sh` - Configuração inicial (migrações, superusuário, etc.)
- `./monitor-service.sh` - Script de monitoramento (executado por cron)

### Comandos Rápidos

```bash
# Verificar status
./status.sh

# Ver logs de monitoramento
tail -f logs/monitor.log

# Ver logs do painel
tail -f logs/painel.log

# Forçar reinício (removerá o monitoramento temporariamente)
./stop-production.sh && ./start-production.sh
```

### Configuração Cron

O sistema usa duas entradas no crontab:
- `@reboot sleep 30 && /home/avelarsys/AvelarMonitor/monitor-service.sh` - Inicialização no boot
- `* * * * * /home/avelarsys/AvelarMonitor/monitor-service.sh` - Monitoramento contínuo

## ⚡ Otimizações Aplicadas

### Configurações de Produção
- ✅ SECRET_KEY segura gerada
- ✅ Configurações DEBUG otimizadas
- ✅ Headers de segurança HSTS, XSS, CSRF
- ✅ Logging estruturado em produção
- ✅ Pool de conexões do banco (CONN_MAX_AGE=60)

### Performance
- ✅ Ambiente virtual Python otimizado
- ✅ Servidor Django com configurações de produção
- ✅ Arquivos estáticos coletados e otimizados
- ✅ Limites de upload aumentados (25MB)
- ✅ Rotação automática de logs (7 dias)

### Segurança
- ✅ Autenticação obrigatória em todas as views
- ✅ Validação de caminhos no gerenciador de arquivos
- ✅ Proteção contra path traversal
- ✅ Headers de segurança configurados

### Monitoramento e Automação
- ✅ **Inicialização automática no boot do sistema**
- ✅ **Reinício automático em caso de falha**
- ✅ Sistema de logs completo
- ✅ Verificação automática de status
- ✅ Monitoramento de recursos (CPU/Memória)
- ✅ Testes de conectividade HTTP
- ✅ Monitoramento contínuo via cron (a cada minuto)

## Estrutura do Projeto

```
AvelarMonitor/
├── apps/
│   ├── core/          # Dashboard e autenticação (local)
│   ├── monitoring/    # Monitoramento de recursos (local)
│   ├── files/         # Gerenciador de arquivos (local)
│   ├── docker/        # Gerenciamento Docker (local)
│   ├── dns/           # Gerenciamento DNS (local)
│   ├── apikeys/       # Gerenciamento de API keys (local)
│   ├── crons/         # Agendamento de tarefas (local)
│   └── multi/         # Monitoramento multi-servidor
│       ├── models.py   # Server, Metric, Alert, Deployment, Backup
│       ├── consumers.py # WebSocket consumers
│       └── views.py    # Views de multi-servidor
├── templates/         # Templates HTML
├── static/            # Arquivos estáticos
├── media/             # Uploads de arquivos
├── agent.py           # Agent para monitoramento remoto
├── omnimonitor/       # Arquivos do OmniMonitor (migrados)
├── manage.py          # Django manage
└── requirements.txt    # Dependências
```

## Segurança

- Todas as views requerem autenticação
- Diretórios críticos são protegidos no gerenciador de arquivos
- API Keys são armazenadas com hash (não em texto plano)
- Validação de caminhos para prevenir path traversal

## Configuração DNS (Cloudflare)

Para usar o gerenciamento DNS com Cloudflare:

1. Obtenha um API Token no painel do Cloudflare
2. Obtenha o Zone ID do seu domínio
3. Adicione um domínio no painel com essas informações
4. Use a função "Sincronizar" para importar registros existentes

## Notas

- O painel roda na porta **9999** por padrão
- Para produção, configure um servidor web (Nginx) como proxy reverso
- Certifique-se de ter permissões adequadas para acessar Docker e sistema de arquivos
- Para Docker, configure seu Nginx existente como proxy reverso para :9999

## Suporte

Para problemas ou dúvidas, consulte a documentação do Django ou entre em contato com a equipe de desenvolvimento.

### Documentação Adicional

- **[DEPLOY_AMO.md](DEPLOY_AMO.md)** - Deploy específico para amo.avelarcompany.dev.br (IP: 217.216.48.148)
- **[DOCKER.md](DOCKER.md)** - Documentação completa de deploy com Docker Compose
- **[INTEGRACAO_OMNIMONITOR.md](INTEGRACAO_OMNIMONITOR.md)** - Detalhes da integração multi-servidor

