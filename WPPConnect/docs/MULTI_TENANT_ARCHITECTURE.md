# Arquitetura Multi-Tenant WPPConnect-3
## Documentação Técnica - TurboZap SaaS

**Versão:** 1.0  
**Data:** 10/02/2026  
**Status:** Planejamento  
**Autor:** AvelarSys Team

---

## 1. VISÃO GERAL DA ARQUITETURA

### 1.1 Contexto
Sistema SaaS onde cada cliente possui seu próprio número WhatsApp conectado à instância `wppconnect-3`. O TurboZap gerencia a lógica de negócio (filas, limites, contatos) enquanto o WPPConnect atua como conector WhatsApp.

### 1.2 Topologia do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      TURBOZAP (SaaS)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │Cliente 1 │  │Cliente 2 │  │Cliente N │                   │
│  │(35msg/d) │  │(35msg/d) │  │(35msg/d) │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│       │             │             │                         │
│       └─────────────┴─────────────┘                         │
│                     │                                       │
│              SQLite (Fila, Histórico)                       │
│                     │                                       │
│         ┌──────────┴──────────┐                            │
│         │ AvAdmin Auth API    │                            │
│         └──────────┬──────────┘                            │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ API REST
                     │
┌────────────────────┼────────────────────────────────────────┐
│                    ▼                                        │
│         ┌────────────────────┐                             │
│         │   wppconnect-3     │                             │
│         │   (Porta 8005)     │                             │
│         └─────────┬──────────┘                             │
│                   │                                         │
│    ┌──────────────┼──────────────┐                         │
│    │              │              │                         │
│ ┌──┴───┐    ┌────┴────┐   ┌─────┴────┐                   │
│ │Sessão│    │ Sessão  │   │ Sessão   │                   │
│ │001   │    │ 002     │   │ 010      │                   │
│ │(Nº   │    │ (Nº     │   │ (Nº      │                   │
│ │What- │    │ Whats  │   │ Whats)   │                   │
│ │sApp) │    │ )       │   │          │                   │
│ └──┬───┘    └────┬────┘   └─────┬────┘                   │
│    │             │              │                         │
│ /tokens/001/  /tokens/002/   /tokens/010/                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA MULTI-TENANT

### 2.1 Definição de Tenant
Cada **tenant** representa um cliente com:
- Identificador único (ex: `cliente-001`, `empresa-abc`)
- Sessão WhatsApp isolada
- Tokens persistentes em subdiretório próprio
- Webhook individual para notificações
- Estado de conexão independente

### 2.2 Capacidade por Instância

| Métrica | Valor | Observação |
|---------|-------|------------|
| **Tenants por instância** | 10 | Limite inicial por wppconnect-3 |
| **Sessões simultâneas** | 10 | Uma por cliente |
| **Memória RAM** | 4GB | Recomendado para 10 sessões |
| **CPU** | 2-4 cores | Dependente da carga |
| **Disco (tokens)** | ~100MB por sessão | Inclui cache do Chromium |

### 2.3 Estrutura de Diretórios

```
/home/avelarsys/AvelarSys/WPPConnect/
├── server.js                    # Código principal modificado
├── package.json
├── docker-compose.yml           # Configuração wppconnect-3
├── tokens-3/                    # Volume Docker
│   ├── cliente-001/            # Tenant 1
│   ├── cliente-002/            # Tenant 2
│   ├── cliente-003/            # Tenant 3
│   ├── ...
│   └── cliente-010/            # Tenant 10
├── logs/
└── docs/
    └── MULTI_TENANT_ARCHITECTURE.md  # Este documento
```

---

## 3. ESTADO DAS SESSÕES

### 3.1 Estados Possíveis

| Estado | Descrição | Ação do TurboZap |
|--------|-----------|------------------|
| `initializing` | Sessão sendo criada/iniciada | Aguardar... |
| `waiting_scan` | Aguardando QR Code | Exibir QR ao usuário |
| `connected` | Conectado e operacional | Permitir envio |
| `disconnected` | Desconectado manualmente | Oferecer reconexão |
| `phone_disconnected` | Celular offline | Notificar usuário |
| `error` | Erro na conexão | Log + notificação |
| `reconnecting` | Tentando reconexão automática | Aguardar resultado |

### 3.2 Ciclo de Vida da Sessão

```
┌──────────────┐
│  CRIAR       │ ← POST /api/sessions
│  SESSÃO      │   TurboZap chama
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│INITIALIZING  │────▶│WAITING_SCAN  │ ← QR Code gerado
│              │     │              │
└──────────────┘     └──────┬───────┘
                            │
                    (usuário escaneia)
                            │
                            ▼
┌─────────────────────────────────────────┐
│           CONNECTED                     │ ← Sessão ativa
│  ┌─────────────────────────────────┐   │
│  │ • Envia mensagens               │   │
│  │ • Recebe webhooks               │   │
│  │ • Reconexão automática          │   │
│  │   se desconectar                │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────┐      ┌──────────────┐
│DISCONNECT│      │PHONE_DISCON  │
│ (manual) │      │   (erro)     │
└────┬─────┘      └──────┬───────┘
     │                   │
     ▼                   ▼
┌──────────┐      ┌──────────────┐
│  Aguarda │      │  Webhook     │ ← Notifica TurboZap
│  ação    │      │  erro        │
│  usuário │      │              │
└──────────┘      └──────────────┘
```

---

## 4. API REST MULTI-TENANT

### 4.1 Autenticação

Todas as requisições requerem autenticação via AvAdmin Auth API:

```
Headers obrigatórios:
Authorization: Bearer <token_jwt_avadmin>
X-Session-ID: <identificador_do_tenant>
```

**Fluxo de Validação:**
1. Cliente faz login no TurboZap
2. TurboZap valida credenciais via AvAdmin API
3. AvAdmin retorna JWT + permissões
4. TurboZap armazena token e inclui em todas chamadas ao WPPConnect
5. WPPConnect confia no TurboZap (Opção C - sem validação adicional)

### 4.2 Endpoints por Tenant

#### 4.2.1 Gerenciamento de Sessões

**Criar/Iniciar Sessão**
```http
POST /api/sessions/:sessionId/start
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body (opcional):
{
  "webhookUrl": "https://turbozap.com/webhook/cliente-001",
  "description": "Conta WhatsApp da Empresa ABC"
}

Response 201 Created:
{
  "sessionId": "cliente-001",
  "status": "initializing",
  "qrCode": null,
  "createdAt": "2026-02-10T14:30:00Z",
  "webhookUrl": "https://turbozap.com/webhook/cliente-001"
}
```

**Observação:** Se a sessão já existe (pasta tokens presente), retorna status atual sem criar nova.

**Obter QR Code**
```http
GET /api/sessions/:sessionId/qrcode
Headers:
  Authorization: Bearer <jwt_token>

Response 200 OK (aguardando):
{
  "sessionId": "cliente-001",
  "status": "waiting_scan",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "expiresAt": "2026-02-10T14:35:00Z"
}

Response 200 OK (já conectado):
{
  "sessionId": "cliente-001",
  "status": "connected",
  "message": "WhatsApp já está conectado",
  "phone": "5511999999999"
}
```

**Status da Sessão**
```http
GET /api/sessions/:sessionId/status
Headers:
  Authorization: Bearer <jwt_token>

Response 200 OK:
{
  "sessionId": "cliente-001",
  "status": "connected",
  "phone": "5511999999999",
  "platform": "android",
  "connectedAt": "2026-02-10T14:32:15Z",
  "lastActivity": "2026-02-10T15:45:22Z",
  "messagesSent": 12,
  "messagesReceived": 5
}
```

**Encerrar Sessão**
```http
DELETE /api/sessions/:sessionId
Headers:
  Authorization: Bearer <jwt_token>

Response 200 OK:
{
  "success": true,
  "message": "Sessão encerrada. Tokens preservados para reconexão futura."
}

# Nota: Os tokens não são deletados, apenas a conexão é fechada.
# Para deletar completamente (logout), usar endpoint abaixo.
```

**Logout Completo (remover tokens)**
```http
POST /api/sessions/:sessionId/logout
Headers:
  Authorization: Bearer <jwt_token>

Response 200 OK:
{
  "success": true,
  "message": "Logout realizado. QR Code será necessário na próxima conexão."
}
```

#### 4.2.2 Envio de Mensagens

**Enviar Mensagem de Texto**
```http
POST /api/sessions/:sessionId/send-message
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "phone": "5511999999999",
  "message": "Olá! Esta é uma mensagem de teste.",
  "isGroup": false,
  "typing": true,
  "typingDuration": 3000
}

Response 200 OK:
{
  "success": true,
  "id": "3EB0F6F2E2E2E2E2E2E",
  "to": "5511999999999@c.us",
  "status": "sent",
  "timestamp": "2026-02-10T15:50:30Z"
}

Response 503 Service Unavailable (desconectado):
{
  "success": false,
  "error": "WhatsApp não está conectado",
  "status": "disconnected",
  "reconnectRequired": true
}
```

**Enviar Imagem**
```http
POST /api/sessions/:sessionId/send-image
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "phone": "5511999999999",
  "imageUrl": "https://exemplo.com/imagem.jpg",
  "caption": "Legenda da imagem",
  "typing": true
}

Response 200 OK:
{
  "success": true,
  "id": "3EB0F6F2E2E2E2E2E2F",
  "to": "5511999999999@c.us",
  "status": "sent",
  "timestamp": "2026-02-10T15:52:10Z"
}
```

**Enviar Arquivo**
```http
POST /api/sessions/:sessionId/send-file
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "phone": "5511999999999",
  "fileUrl": "https://exemplo.com/documento.pdf",
  "fileName": "relatorio.pdf",
  "caption": "Segue o relatório solicitado"
}
```

#### 4.2.3 Operações com Contatos

**Listar Contatos**
```http
GET /api/sessions/:sessionId/contacts
Headers:
  Authorization: Bearer <jwt_token>

Response 200 OK:
{
  "success": true,
  "count": 150,
  "contacts": [
    {
      "id": "5511999999999@c.us",
      "phone": "5511999999999",
      "name": "João Silva",
      "pushname": "João",
      "isBusiness": false
    }
  ]
}
```

**Verificar Número**
```http
GET /api/sessions/:sessionId/check-number/:phone
Headers:
  Authorization: Bearer <jwt_token>

Response 200 OK:
{
  "phone": "5511999999999",
  "valid": true,
  "canReceiveMessage": true,
  "isBusiness": false
}
```

#### 4.2.4 Webhooks

**Configurar Webhook**
```http
PUT /api/sessions/:sessionId/webhook
Headers:
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

Body:
{
  "url": "https://turbozap.com/webhook/cliente-001",
  "events": ["message_received", "message_ack", "connection_change"]
}

Response 200 OK:
{
  "success": true,
  "webhookUrl": "https://turbozap.com/webhook/cliente-001",
  "events": ["message_received", "message_ack", "connection_change"]
}
```

---

## 5. WEBHOOKS - COMUNICAÇÃO COM TURBOZAP

### 5.1 Eventos Disponíveis

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `message_received` | Mensagem recebida | `{ sessionId, message: {...} }` |
| `message_ack` | Confirmação de envio | `{ sessionId, messageId, status }` |
| `connection_change` | Mudança de estado | `{ sessionId, status, previousStatus }` |
| `qr_code` | Novo QR Code gerado | `{ sessionId, qrCode, expiresAt }` |
| `error` | Erro na sessão | `{ sessionId, error, code }` |

### 5.2 Payloads Detalhados

**message_received**
```json
{
  "event": "message_received",
  "sessionId": "cliente-001",
  "timestamp": "2026-02-10T15:55:00Z",
  "message": {
    "id": "3EB0F6F2E2E2E2E2E30",
    "from": "5511888888888@c.us",
    "to": "5511999999999@c.us",
    "body": "Olá, tudo bem?",
    "type": "chat",
    "timestamp": 1739202900,
    "isGroupMsg": false,
    "sender": {
      "name": "Maria Souza",
      "phone": "5511888888888"
    }
  }
}
```

**connection_change**
```json
{
  "event": "connection_change",
  "sessionId": "cliente-001",
  "timestamp": "2026-02-10T16:00:00Z",
  "status": "phone_disconnected",
  "previousStatus": "connected",
  "reason": "Celular desconectado da internet"
}
```

**error**
```json
{
  "event": "error",
  "sessionId": "cliente-001",
  "timestamp": "2026-02-10T16:05:00Z",
  "error": "Falha na autenticação",
  "code": "AUTH_FAILED",
  "recoverable": true
}
```

### 5.3 Retry Policy

Se o webhook falhar (HTTP != 2xx):
1. Tentativa imediata
2. Retry após 5 segundos
3. Retry após 30 segundos
4. Retry após 5 minutos
5. Abandonar e logar erro

---

## 6. ESTRUTURA DE DADOS

### 6.1 Mapa de Sessões (Memória)

```javascript
const sessions = new Map();

// Estrutura de cada entrada:
{
  sessionId: "cliente-001",
  client: <Whatsapp>,           // Instância WPPConnect
  status: "connected",          // Estado atual
  qrCode: null,                 // QR Code atual (se houver)
  phone: "5511999999999",       // Número conectado
  platform: "android",          // Plataforma do WhatsApp
  config: {
    webhookUrl: "https://...",
    description: "Empresa ABC",
    createdAt: Date,
    maxMessagesPerDay: 35       // Limite informativo (controle no TurboZap)
  },
  stats: {
    messagesSent: 12,
    messagesReceived: 5,
    lastActivity: Date,
    connectedAt: Date
  },
  tokensPath: "./tokens/cliente-001"
}
```

### 6.2 Limites e Controles

| Configuração | Valor | Onde Controlado |
|--------------|-------|-----------------|
| Máximo de sessões | 10 | Variável `MAX_SESSIONS` |
| Timeout de inatividade | 30 dias | TurboZap (deleta sessão) |
| Reconexões automáticas | ∞ | Até sucesso ou manual stop |
| Rate limit por sessão | 100 req/min | Middleware Express |
| Payload máximo | 10MB | Express limit |

---

## 7. CONFIGURAÇÃO DOCKER

### 7.1 docker-compose.yml - wppconnect-3

```yaml
wppconnect-3:
  build:
    context: /home/avelarsys/AvelarSys/WPPConnect
    dockerfile: Dockerfile
  container_name: avelarsys-wppconnect-3
  user: "0:0"
  env_file:
    - ../docker.env
  command: ["sh", "/app/start.sh"]
  environment:
    # Configurações básicas
    - WPP_PORT=8005
    - WPP_MULTI_TENANT=true
    - WPP_MAX_SESSIONS=10
    - WPP_SECRET=${WPP_SECRET:-avelar-wpp-secret}
    
    # Redis para cache compartilhado
    - REDIS_URL=redis://redis:6379
    - NODE_ENV=production
    
    # Configurações de performance
    - WEBHOOK_TIMEOUT=30000
    - WEBHOOK_RETRIES=3
    
  ports:
    - "8005:8005"
  
  restart: unless-stopped
  
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8005/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  
  volumes:
    # Volume base para tokens - cada tenant terá subpasta
    - /home/avelarsys/AvelarSys/WPPConnect/tokens-3:/app/tokens
    - /home/avelarsys/AvelarSys/WPPConnect/logs:/app/logs
  
  networks:
    - avelarsys-network
  
  depends_on:
    - redis
  
  extra_hosts:
    - "host.docker.internal:host-gateway"
  
  deploy:
    resources:
      limits:
        memory: 4G
        cpus: '2.0'
      reservations:
        memory: 2G
        cpus: '1.0'
```

### 7.2 Variáveis de Ambiente (docker.env)

```bash
# ========================================
# WPPCONNECT-3 - Multi-Tenant Config
# ========================================

# Porta da API
WPP_PORT=8005

# Modo multi-tenant (obrigatório para wppconnect-3)
WPP_MULTI_TENANT=true

# Limite máximo de sessões simultâneas
WPP_MAX_SESSIONS=10

# Chave secreta para validações internas
WPP_SECRET=chave-secreta-aqui

# Webhook padrão (pode ser sobrescrito por sessão)
WEBHOOK_URL=http://avelarsys-turbozap:3000/api/webhook/default

# Timeout para chamadas webhook (ms)
WEBHOOK_TIMEOUT=30000

# Redis para cache
REDIS_URL=redis://redis:6379

# Performance
NODE_ENV=production
LOG_LEVEL=info

# Proxy (opcional)
# WPP_PROXY_URL=http://proxy:port
```

---

## 8. FLUXOS DE TRABALHO

### 8.1 Onboarding de Novo Cliente

```
1. TurboZap recebe cadastro de novo cliente
   ↓
2. TurboZap gera sessionId (ex: cliente-011)
   ↓
3. TurboZap chama: POST /api/sessions/cliente-011/start
   Headers: Authorization: Bearer <jwt>
   ↓
4. WPPConnect cria sessão, retorna status "initializing"
   ↓
5. WPPConnect gera QR Code → webhook "qr_code" → TurboZap
   ↓
6. TurboZap exibe QR Code para cliente no painel
   ↓
7. Cliente escaneia QR Code com WhatsApp
   ↓
8. WPPConnect conecta → webhook "connection_change" (connected)
   ↓
9. TurboZap atualiza status: "Conectado ✓"
   ↓
10. Cliente pode começar a enviar mensagens!
```

### 8.2 Envio de Mensagem

```
1. Cliente solicita envio no TurboZap (dentro do limite de 35/dia)
   ↓
2. TurboZap valida limite no SQLite
   ↓
3. TurboZap chama: POST /api/sessions/cliente-001/send-message
   Headers: Authorization: Bearer <jwt>
   ↓
4. WPPConnect verifica se sessão está "connected"
   ↓
5. Se sim: Envia mensagem via WhatsApp Web
   ↓
6. WPPConnect retorna sucesso + messageId
   ↓
7. TurboZap registra no histórico e decrementa limite diário
   ↓
8. WhatsApp confirma entrega → webhook "message_ack" → TurboZap
   ↓
9. TurboZap atualiza status da mensagem: "Entregue ✓"
```

### 8.3 Reconexão Automática

```
1. Sessão perde conexão (celular offline, rede, etc.)
   ↓
2. WPPConnect detecta desconexão
   ↓
3. WPPConnect envia webhook "connection_change" (phone_disconnected)
   ↓
4. TurboZap notifica cliente: "WhatsApp desconectado"
   ↓
5. WPPConnect tenta reconectar automaticamente a cada 30s
   ↓
6. Se celular voltar online: Reconexão bem-sucedida
   ↓
7. WPPConnect envia webhook "connection_change" (connected)
   ↓
8. TurboZap notifica: "WhatsApp reconectado ✓"
   ↓
9. Cliente continua usando normalmente (sem escanear QR novamente)
```

### 8.4 Término do Ciclo (Fim do Mês)

```
1. Cliente atinge limite de 2 sessões ou final do mês
   ↓
2. TurboZap agenda: POST /api/sessions/cliente-001/disconnect
   (mantém tokens para possível reconexão no próximo mês)
   ↓
3. WPPConnect fecha conexão WhatsApp
   ↓
4. Tokens permanecem em /tokens/cliente-001/
   ↓
5. No próximo mês, cliente pode:
   a) Reconectar mesma sessão: POST /api/sessions/cliente-001/start
      (usa tokens existentes, reconexão automática)
   b) Criar nova sessão: DELETE tokens + criar nova
```

---

## 9. CONSIDERAÇÕES DE SEGURANÇA

### 9.1 Autenticação
- **AvAdmin API** é a fonte da verdade para autenticação
- WPPConnect confia no JWT do AvAdmin (validação por assinatura)
- Não há autenticação adicional por sessão (Opção C)
- Token JWT deve ter expiração curta (15-30 min) com refresh

### 9.2 Isolamento de Dados
- Tokens de cada tenant em subpastas separadas
- Nenhuma sessão pode acessar dados de outra
- Logs identificam sessionId em todas as operações
- Redis usa prefixos por sessão (ex: `wpp:cliente-001:qrcode`)

### 9.3 Proteção contra Abuso
- Rate limiting: 100 requisições/minuto por sessão
- Limite de 10 sessões simultâneas (hard limit)
- Payload limitado a 10MB
- Timeout de 30s em webhooks

### 9.4 Persistência Segura
- Tokens não são criptografados (limitação WPPConnect)
- Acesso ao volume Docker deve ser restrito
- Backup regular dos tokens para recuperação
- Rotação de logs para não expor dados sensíveis

---

## 10. MONITORAMENTO E LOGS

### 10.1 Métricas Importantes

| Métrica | Fonte | Ação em Alerta |
|---------|-------|----------------|
| Uso de RAM | Docker stats | > 3.5GB = Alerta |
| Uso de CPU | Docker stats | > 80% por 5min = Alerta |
| Sessões ativas | /api/health | < 10 conectadas = Verificar |
| Taxa de erro | Logs | > 5% falhas = Investigar |
| Tempo de resposta | APM | > 5s = Performance |
| Webhook falhas | Contador interno | > 10 falhas/min = Verificar TurboZap |

### 10.2 Estrutura de Logs

```javascript
// Formato de log padronizado
{
  "timestamp": "2026-02-10T15:30:00Z",
  "level": "info",
  "sessionId": "cliente-001",
  "event": "message_sent",
  "details": {
    "messageId": "3EB0F6F2...",
    "to": "5511999999999",
    "status": "sent"
  },
  "metadata": {
    "memoryUsage": "2.1GB",
    "sessionCount": 10
  }
}
```

### 10.3 Alertas Automáticos

```javascript
// Pseudo-código de monitoramento
if (memoryUsage > 85%) {
  alert("WPPConnect-3 RAM alta", { current: memoryUsage });
}

if (failedWebhooks > 10) {
  alert("Webhooks falhando", { count: failedWebhooks });
}

sessions.forEach((session, id) => {
  if (session.status === 'error') {
    alert(`Sessão ${id} em erro`, { error: session.lastError });
  }
});
```

---

## 11. PLANOS DE CONTINGÊNCIA

### 11.1 Falha de Sessão Específica

**Cenário:** Cliente-003 perde conexão e não reconecta

**Ações:**
1. WPPConnect tenta reconectar automaticamente (x10)
2. Após falhas, envia webhook "error" para TurboZap
3. TurboZap notifica usuário: "Reconexão necessária"
4. Usuário pode tentar:
   - Verificar internet do celular
   - Solicitar novo QR Code (POST /restart)
   - Aguardar (reconexão automática continua)

### 11.2 Falha Total da Instância

**Cenário:** Container wppconnect-3 cai

**Ações:**
1. Docker reinicia automaticamente (`restart: unless-stopped`)
2. Ao subir, WPPConnect lê tokens existentes em /tokens/
3. Tenta reconectar todas as sessões automaticamente
4. Envia webhooks de "connection_change" para cada uma
5. TurboZap atualiza status de todos os clientes

**Tempo de recuperação:** ~2-5 minutos

### 11.3 Corrupção de Tokens

**Cenário:** Arquivos de token corrompidos

**Ações:**
1. WPPConnect detecta erro na inicialização da sessão
2. Envia webhook "error" com código "TOKEN_CORRUPT"
3. TurboZap oferece opção ao cliente:
   - Resetar sessão (deleta tokens + novo QR)
   - Restaurar de backup (se disponível)

### 11.4 Limite de Recursos Atingido

**Cenário:** RAM cheia (4GB), nova sessão falha

**Ações:**
1. WPPConnect retorna erro: "Limite de recursos atingido"
2. TurboZap pode:
   - Sugerir upgrade de plano
   - Agendar desconexão de sessões inativas
   - Migrar cliente para wppconnect-4 (quando existir)

---

## 12. IMPLEMENTAÇÃO FUTURA

### 12.1 Escalabilidade Horizontal

Quando necessário expandir além de 10 clientes:

**Opção A: Múltiplas Instâncias Multi-Tenant**
```
wppconnect-3: clientes 001-010
wppconnect-4: clientes 011-020
wppconnect-5: clientes 021-030
```

**Opção B: WPPConnect Server Oficial**
- Migração para `@wppconnect/server`
- Suporte nativo a múltiplas sessões
- API mais robusta

### 12.2 Melhorias Sugeridas

| Prioridade | Melhoria | Impacto |
|------------|----------|---------|
| Alta | Pool de navegadores | Reduzir uso de RAM |
| Média | Dashboard de monitoramento | Visibilidade de saúde |
| Média | Métricas Prometheus | Observabilidade |
| Baixa | Auto-scaling | Crescer conforme demanda |
| Baixa | Balanceamento inteligente | Distribuir carga entre instâncias |

---

## 13. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **Tenant** | Cliente individual com sua própria sessão WhatsApp |
| **Sessão** | Conexão ativa entre WPPConnect e WhatsApp Web |
| **Token** | Arquivos de autenticação persistidos para reconexão |
| **QR Code** | Código gerado para pareamento inicial do WhatsApp |
| **Webhook** | Endpoint HTTP que recebe notificações de eventos |
| **TurboZap** | SaaS que gerencia filas, limites e interface do usuário |
| **WPPConnect** | Biblioteca Node.js para automação do WhatsApp Web |
| **AvAdmin** | Sistema de autenticação e administração central |

---

## 14. ANEXOS

### 14.1 Exemplo de Configuração Completa

Ver arquivo: `docker-compose-wppconnect-3.yml`

### 14.2 Checklist de Deploy

- [ ] Docker e Docker Compose instalados
- [ ] Rede `avelarsys-network` criada
- [ ] Redis rodando e acessível
- [ ] Volume `tokens-3` criado com permissões corretas
- [ ] Variáveis de ambiente configuradas no `docker.env`
- [ ] Porta 8005 liberada no firewall
- [ ] Webhook do TurboZap acessível pela rede Docker
- [ ] Backup automático de /tokens-3 configurado
- [ ] Monitoramento de recursos ativo
- [ ] Teste de envio de mensagem realizado
- [ ] Teste de reconexão automática validado

### 14.3 Contatos e Responsáveis

| Função | Responsável | Contato |
|--------|-------------|---------|
| Infraestrutura | AvelarSys DevOps | infra@avelarsys.com |
| TurboZap | AvelarSys Backend | backend@avelarsys.com |
| Suporte N1 | AvelarSys Support | support@avelarsys.com |

---

## 15. HISTÓRICO DE VERSÕES

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 2026-02-10 | AvelarSys Team | Documento inicial |

---

**Próximos Passos Sugeridos:**
1. Revisar arquitetura com stakeholders
2. Validar estimativas de recursos (RAM, CPU)
3. Criar ambiente de staging para testes
4. Implementar seguindo o plano de migração
5. Documentar ajustes realizados durante implementação

---

*Documento gerado para AvelarSys - TurboZap SaaS*  
*Arquitetura Multi-Tenant para WPPConnect-3*
