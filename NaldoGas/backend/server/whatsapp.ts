import { Boom } from "@hapi/boom";
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Readable } from "stream";
import path from "path";
import fs from "fs";

/**
 * Módulo de Integração com WhatsApp usando Baileys
 * Permite enviar e receber mensagens via WhatsApp Web
 */

let sock: any = null;
let isConnected = false;
const authFolder = path.join(process.cwd(), "whatsapp_auth");

/**
 * Inicializar conexão com WhatsApp
 */
export async function initializeWhatsApp() {
  if (sock && isConnected) {
    console.log("[WhatsApp] Já conectado");
    return sock;
  }

  try {
    // Criar pasta de autenticação se não existir
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp] Usando versão ${version}, é a mais recente: ${isLatest}`);

    sock = makeWASocket({
      version,
      logger: console as any,
      auth: state,
      printQRInTerminal: true,
      browser: ["NaldoGás", "Chrome", "1.0.0"],
    });

    // Salvar credenciais quando forem atualizadas
    sock.ev.on("creds.update", saveCreds);

    // Lidar com atualizações de conexão
    sock.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("[WhatsApp] QR Code gerado. Escaneie com seu celular.");
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log("[WhatsApp] Reconectando...");
          isConnected = false;
          setTimeout(() => initializeWhatsApp(), 3000);
        } else {
          console.log("[WhatsApp] Desconectado");
          isConnected = false;
        }
      } else if (connection === "open") {
        console.log("[WhatsApp] Conectado com sucesso!");
        isConnected = true;
      }
    });

    // Lidar com mensagens recebidas
    sock.ev.on("messages.upsert", async (m: any) => {
      const msg = m.messages[0];

      if (!msg.message) return;

      const jid = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

      console.log(`[WhatsApp] Mensagem recebida de ${jid}: ${text}`);

      // TODO: Processar mensagens recebidas (ex: pedidos via WhatsApp)
    });

    return sock;
  } catch (error) {
    console.error("[WhatsApp] Erro ao inicializar:", error);
    throw error;
  }
}

/**
 * Enviar mensagem de texto via WhatsApp
 */
export async function sendMessage(phoneNumber: string, message: string) {
  if (!sock || !isConnected) {
    throw new Error("WhatsApp não está conectado");
  }

  try {
    // Formatar número para JID (adicionar @s.whatsapp.net)
    const jid = phoneNumber.includes("@") ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

    const response = await sock.sendMessage(jid, { text: message });

    console.log(`[WhatsApp] Mensagem enviada para ${phoneNumber}`);

    return {
      success: true,
      messageId: response.key.id,
      timestamp: response.messageTimestamp,
    };
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar mensagem para ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Enviar notificação de venda via WhatsApp
 */
export async function sendSaleNotification(phoneNumber: string, customerName: string, amount: number, items: string[]) {
  const message = `
🛒 *Nova Venda Registrada*

Cliente: ${customerName}
Valor: R$ ${amount.toFixed(2)}
Itens: ${items.join(", ")}

Obrigado por usar NaldoGás!
  `.trim();

  return sendMessage(phoneNumber, message);
}

/**
 * Enviar notificação de entrega via WhatsApp
 */
export async function sendDeliveryNotification(phoneNumber: string, customerName: string, address: string, estimatedTime: string) {
  const message = `
🚚 *Sua Entrega Saiu para Rota*

Cliente: ${customerName}
Endereço: ${address}
Tempo estimado: ${estimatedTime}

Acompanhe sua entrega em tempo real!
  `.trim();

  return sendMessage(phoneNumber, message);
}

/**
 * Enviar notificação de fiado vencido via WhatsApp
 */
export async function sendOverdueNotification(phoneNumber: string, customerName: string, amount: number, daysOverdue: number) {
  const message = `
⚠️ *Aviso: Fiado Vencido*

Cliente: ${customerName}
Valor: R$ ${amount.toFixed(2)}
Dias vencido: ${daysOverdue}

Por favor, regularize sua dívida o quanto antes.
  `.trim();

  return sendMessage(phoneNumber, message);
}

/**
 * Enviar notificação de estoque baixo via WhatsApp
 */
export async function sendLowStockNotification(phoneNumber: string, productName: string, quantity: number) {
  const message = `
📦 *Alerta: Estoque Baixo*

Produto: ${productName}
Quantidade: ${quantity} unidades

Considere reabastecer este produto.
  `.trim();

  return sendMessage(phoneNumber, message);
}

/**
 * Enviar notificação de devolução de vasilhame vencida via WhatsApp
 */
export async function sendContainerReturnNotification(phoneNumber: string, customerName: string, daysOverdue: number) {
  const message = `
🔔 *Devolução de Vasilhame Vencida*

Cliente: ${customerName}
Dias vencido: ${daysOverdue}

Por favor, devolva o vasilhame o quanto antes.
  `.trim();

  return sendMessage(phoneNumber, message);
}

/**
 * Obter status da conexão
 */
export function getConnectionStatus() {
  return {
    connected: isConnected,
    socket: sock ? "Inicializado" : "Não inicializado",
  };
}

/**
 * Desconectar do WhatsApp
 */
export async function disconnectWhatsApp() {
  if (sock) {
    await sock.logout();
    isConnected = false;
    console.log("[WhatsApp] Desconectado");
  }
}

/**
 * Obter informações do usuário conectado
 */
export function getWhatsAppUser() {
  if (!sock || !isConnected) {
    return null;
  }

  return sock.user;
}
