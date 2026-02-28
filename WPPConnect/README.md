# Avelar WPPConnect Server

Servidor Node.js para integração WhatsApp via WPPConnect, alternativa ao WhatsApp Business API para o AvelarSys.

## Requisitos

- Node.js 18+
- Chromium/Chrome instalado
- WhatsApp no celular para escanear QR Code

## Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de configuração
cp env.example .env

# Editar configurações
nano .env
```

## Execução

```bash
# Produção
npm start

# Desenvolvimento (com hot reload)
npm run dev
```

## Como Conectar

1. Inicie o servidor: `npm start`
2. Acesse `http://localhost:21465/api/qrcode`
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a conexão ser estabelecida

## API Endpoints

### Status e Conexão

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/status` | Status da conexão |
| GET | `/api/health` | Health check |
| GET | `/api/qrcode` | Obter QR Code |
| GET | `/api/profile` | Info do perfil conectado |
| POST | `/api/restart` | Reiniciar sessão |
| POST | `/api/disconnect` | Desconectar |

### Envio de Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/send-message` | Enviar texto |
| POST | `/api/send-image` | Enviar imagem |
| POST | `/api/send-file` | Enviar arquivo |

### Exemplo: Enviar Mensagem

```bash
curl -X POST http://localhost:21465/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste."
  }'
```

### Outros

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/check-number/:phone` | Verificar se número existe |
| GET | `/api/messages` | Listar mensagens enviadas |

## Integração com AvAdmin

O servidor envia webhooks para o AvAdmin quando:
- Mensagem é recebida
- Status de mensagem muda

Configure a URL do webhook no `.env`:
```
WEBHOOK_URL=http://localhost:8010/api/whatsapp/webhook
```

## Arquivos de Sessão

Os dados da sessão são salvos em `./tokens/`. Para reconectar automaticamente após reinício, mantenha esta pasta.

Para forçar novo login, delete a pasta `tokens/` e reinicie.

## Logs

Os logs são salvos em `./logs/wppconnect.log` e também exibidos no console.

## Produção

Para produção, recomenda-se:

1. Usar PM2 para gerenciamento:
```bash
npm install -g pm2
pm2 start server.js --name wppconnect
pm2 save
```

2. Configurar reverse proxy (Nginx):
```nginx
location /wppconnect/ {
    proxy_pass http://localhost:21465/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

## Troubleshooting

### QR Code não aparece
- Verifique se Chromium está instalado
- Delete a pasta `tokens/` e reinicie

### Erro de conexão
- Verifique se o WhatsApp no celular está online
- Tente reconectar escaneando novo QR Code

### Mensagens não enviadas
- Verifique se o número está correto (com código do país)
- Verifique se o número tem WhatsApp

## Licença

MIT - Avelar Company

