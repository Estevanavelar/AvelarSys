# Integração WhatsApp - AxCellOS

Este documento descreve como integrar seu servidor WhatsApp com o AxCellOS para enviar notificações automáticas aos clientes.

## 📋 Visão Geral

O AxCellOS está preparado para enviar notificações via WhatsApp em três cenários principais:

1. **Confirmação de Ordem** - Quando uma nova ordem é criada
2. **Atualização de Status** - Quando o status de uma ordem muda (Recebido → Em Reparo → Pronto → Entregue)
3. **Mensagens Customizadas** - Para comunicações específicas com o cliente

## 🗄️ Schema do Banco de Dados

### Tabela: `customers`
Armazena informações dos clientes com suporte a WhatsApp:

```sql
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(320),
  whatsappNumber VARCHAR(20),                    -- Número do cliente para WhatsApp
  whatsappNotificationsEnabled BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabela: `whatsappMessages`
Armazena histórico de todas as mensagens enviadas:

```sql
CREATE TABLE whatsappMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customerId INT NOT NULL,
  serviceOrderId INT,
  recipientNumber VARCHAR(20) NOT NULL,
  messageType ENUM('order_created', 'status_changed', 'ready_for_pickup', 'delivered', 'custom'),
  messageContent TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending',
  sentAt TIMESTAMP,
  failureReason TEXT,
  externalMessageId VARCHAR(255),               -- ID retornado pelo servidor WhatsApp
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabela: `serviceOrderHistory`
Rastreia mudanças de status com notificação de WhatsApp:

```sql
CREATE TABLE serviceOrderHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serviceOrderId INT NOT NULL,
  previousStatus VARCHAR(50),
  newStatus VARCHAR(50) NOT NULL,
  notes TEXT,
  changedBy INT,
  whatsappNotificationSent BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔌 Procedimentos tRPC

### 1. Enviar Confirmação de Ordem

**Endpoint:** `trpc.whatsapp.sendOrderConfirmation`

```typescript
// Input
{
  customerId: number,
  orderNumber: string,
  customerName: string,
  deviceBrand: string,
  deviceModel: string,
  whatsappNumber: string,
}

// Response
{
  success: boolean,
  messageId: string,
  message: string,
}
```

**Uso:**
```typescript
await trpc.whatsapp.sendOrderConfirmation.mutate({
  customerId: 1,
  orderNumber: 'OS-20260122001',
  customerName: 'João Silva',
  deviceBrand: 'Apple',
  deviceModel: 'iPhone 14',
  whatsappNumber: '5511987654321',
});
```

### 2. Enviar Atualização de Status

**Endpoint:** `trpc.whatsapp.sendStatusUpdate`

```typescript
// Input
{
  customerId: number,
  orderNumber: string,
  customerName: string,
  whatsappNumber: string,
  newStatus: 'Recebido' | 'Em Reparo' | 'Pronto' | 'Entregue',
  notes?: string,
}

// Response
{
  success: boolean,
  messageId: string,
  message: string,
}
```

**Uso:**
```typescript
await trpc.whatsapp.sendStatusUpdate.mutate({
  customerId: 1,
  orderNumber: 'OS-20260122001',
  customerName: 'João Silva',
  whatsappNumber: '5511987654321',
  newStatus: 'Em Reparo',
  notes: 'Iniciado reparo da bateria',
});
```

### 3. Enviar Mensagem Customizada

**Endpoint:** `trpc.whatsapp.sendCustomMessage`

```typescript
// Input
{
  customerId: number,
  whatsappNumber: string,
  message: string,
  orderNumber?: string,
}

// Response
{
  success: boolean,
  messageId: string,
}
```

**Uso:**
```typescript
await trpc.whatsapp.sendCustomMessage.mutate({
  customerId: 1,
  whatsappNumber: '5511987654321',
  message: 'Seu dispositivo está pronto para retirada!',
  orderNumber: 'OS-20260122001',
});
```

### 4. Obter Histórico de Mensagens

**Endpoint:** `trpc.whatsapp.getMessageHistory`

```typescript
// Input
{
  customerId: number,
}

// Response
{
  messages: Array<{
    id: number,
    messageType: string,
    messageContent: string,
    status: string,
    sentAt: Date,
  }>,
  total: number,
}
```

### 5. Verificar Status de Entrega

**Endpoint:** `trpc.whatsapp.getMessageStatus`

```typescript
// Input
{
  messageId: string,
}

// Response
{
  messageId: string,
  status: 'pending' | 'sent' | 'failed' | 'delivered',
  sentAt: Date,
}
```

## 🎨 Componentes de UI

### WhatsAppNotificationDialog

Componente para enviar mensagens via WhatsApp com templates pré-configurados.

**Localização:** `client/src/components/WhatsAppNotificationDialog.tsx`

**Props:**
```typescript
{
  open: boolean,
  onOpenChange: (open: boolean) => void,
  customerName: string,
  whatsappNumber: string,
  orderNumber: string,
  notificationType?: 'order_created' | 'status_changed' | 'custom',
  onSend?: (message: string) => void,
}
```

**Uso:**
```tsx
<WhatsAppNotificationDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  customerName="João Silva"
  whatsappNumber="5511987654321"
  orderNumber="OS-20260122001"
  notificationType="status_changed"
  onSend={(message) => console.log(message)}
/>
```

### OrderWhatsAppActions

Componente para gerenciar ações de WhatsApp na página de detalhes da ordem.

**Localização:** `client/src/components/OrderWhatsAppActions.tsx`

**Props:**
```typescript
{
  orderNumber: string,
  customerName: string,
  whatsappNumber: string,
  status: 'Recebido' | 'Em Reparo' | 'Pronto' | 'Entregue',
}
```

**Uso:**
```tsx
<OrderWhatsAppActions
  orderNumber="OS-20260122001"
  customerName="João Silva"
  whatsappNumber="5511987654321"
  status="Em Reparo"
/>
```

## 🔗 Integração com Seu Servidor WhatsApp

### Passo 1: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

```env
# WhatsApp Configuration
WHATSAPP_API_URL=https://seu-servidor-whatsapp.com/api
WHATSAPP_API_KEY=sua_chave_api_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_numero_de_telefone
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_account_id
```

### Passo 2: Implementar Função de Envio

Crie um arquivo `server/whatsapp.ts` com a integração:

```typescript
import axios from 'axios';

interface SendMessageParams {
  recipientNumber: string;
  message: string;
  messageType: string;
}

export async function sendWhatsAppMessage({
  recipientNumber,
  message,
  messageType,
}: SendMessageParams) {
  try {
    const response = await axios.post(
      `${process.env.WHATSAPP_API_URL}/messages/send`,
      {
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        recipient_number: recipientNumber,
        message_body: message,
        message_type: messageType,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      messageId: response.data.message_id,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar mensagem:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
```

### Passo 3: Atualizar Procedures tRPC

Modifique `server/routers.ts` para chamar a função de envio:

```typescript
import { sendWhatsAppMessage } from './whatsapp';

export const appRouter = router({
  whatsapp: router({
    sendOrderConfirmation: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        orderNumber: z.string(),
        customerName: z.string(),
        deviceBrand: z.string(),
        deviceModel: z.string(),
        whatsappNumber: z.string(),
      }))
      .mutation(async ({ input }) => {
        const message = `Olá ${input.customerName}! 👋\n\nSua ordem de serviço foi registrada com sucesso!\n\n📱 Dispositivo: ${input.deviceBrand} ${input.deviceModel}\n📋 Número da OS: ${input.orderNumber}\n\nVocê receberá atualizações sobre o status do seu dispositivo.`;
        
        const result = await sendWhatsAppMessage({
          recipientNumber: input.whatsappNumber,
          message,
          messageType: 'order_created',
        });

        // Salvar no banco de dados
        // await db.insert(whatsappMessages).values({...});

        return result;
      }),
  }),
});
```

### Passo 4: Webhook para Receber Status de Entrega

Configure um endpoint para receber atualizações de status:

```typescript
// server/routers.ts
export const appRouter = router({
  whatsapp: router({
    // ... outros procedures
    
    webhookStatusUpdate: publicProcedure
      .input(z.object({
        messageId: z.string(),
        status: z.enum(['sent', 'delivered', 'failed']),
        timestamp: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        // Atualizar status no banco de dados
        // await db.update(whatsappMessages)
        //   .set({ status: input.status, sentAt: input.timestamp })
        //   .where(eq(whatsappMessages.externalMessageId, input.messageId));

        return { success: true };
      }),
  }),
});
```

## 📊 Fluxo de Integração

```
┌─────────────────────────────────────────────────────────────┐
│                    AxCellOS Frontend                         │
│  (Componentes: WhatsAppNotificationDialog, OrderWhatsAppActions)
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    tRPC Procedures                          │
│  (sendOrderConfirmation, sendStatusUpdate, sendCustomMessage)
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Seu Servidor WhatsApp                          │
│  (API REST com autenticação Bearer)                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cliente WhatsApp                          │
│  (Recebe mensagens e notificações)                          │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Checklist de Implementação

- [ ] Configurar variáveis de ambiente
- [ ] Implementar função `sendWhatsAppMessage`
- [ ] Atualizar procedures tRPC com integração real
- [ ] Criar webhook para receber status de entrega
- [ ] Testar envio de mensagens
- [ ] Validar armazenamento em banco de dados
- [ ] Implementar retry logic para mensagens falhadas
- [ ] Adicionar logging e monitoramento

## 🧪 Teste de Integração

```bash
# Testar envio de mensagem
curl -X POST http://localhost:3000/api/trpc/whatsapp.sendOrderConfirmation \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "orderNumber": "OS-TEST-001",
    "customerName": "Teste",
    "deviceBrand": "Apple",
    "deviceModel": "iPhone 14",
    "whatsappNumber": "5511987654321"
  }'
```

## 📝 Notas Importantes

1. **Número de Telefone:** Use o formato internacional (ex: 5511987654321)
2. **Autenticação:** Certifique-se de que suas credenciais estão seguras
3. **Rate Limiting:** Respeite os limites de taxa do seu servidor WhatsApp
4. **Consentimento:** Obtenha consentimento dos clientes antes de enviar mensagens
5. **Logs:** Mantenha logs de todas as mensagens para auditoria

## 🆘 Troubleshooting

### Mensagens não estão sendo enviadas
- Verifique se as variáveis de ambiente estão configuradas
- Confirme que o número de telefone está no formato correto
- Verifique os logs do servidor para mensagens de erro

### Webhook não está recebendo atualizações
- Confirme que o URL do webhook está configurado no servidor WhatsApp
- Verifique se o endpoint está acessível publicamente
- Valide a assinatura do webhook (se aplicável)

### Erros de autenticação
- Verifique se a chave API está correta
- Confirme que a chave não expirou
- Teste a conexão com o servidor WhatsApp usando curl

## 📞 Suporte

Para dúvidas sobre a integração, consulte:
- Documentação do seu servidor WhatsApp
- Logs do AxCellOS em `.manus-logs/`
- Histórico de mensagens em `whatsappMessages` table
