import { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

let sock: any = null;
let isConnecting = false;
let connectionStatus: "connected" | "disconnected" | "connecting" = "disconnected";
let qrCodeData: string | null = null;

const AUTH_DIR = path.join(process.cwd(), ".whatsapp-auth");

// Garantir que o diretório de autenticação existe
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export async function initializeBaileys() {
  if (sock) {
    return sock;
  }

  if (isConnecting) {
    throw new Error("Conexão já em andamento");
  }

  isConnecting = true;
  connectionStatus = "connecting";

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["NaldoGás", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      shouldIgnoreJid: (jid: string) => !jid.endsWith("@s.whatsapp.net"),
    });

    // Evento de QR Code
    sock.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeData = qr;
        console.log("[WhatsApp] QR Code gerado");
      }

      if (connection === "connecting") {
        connectionStatus = "connecting";
        console.log("[WhatsApp] Conectando...");
      }

      if (connection === "open") {
        connectionStatus = "connected";
        isConnecting = false;
        console.log("[WhatsApp] Conectado com sucesso!");
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          connectionStatus = "disconnected";
          sock = null;
          console.log("[WhatsApp] Reconectando...");
          setTimeout(() => initializeBaileys(), 3000);
        } else {
          connectionStatus = "disconnected";
          sock = null;
          console.log("[WhatsApp] Desconectado pelo usuário");
        }
      }
    });

    // Evento de credenciais
    sock.ev.on("creds.update", saveCreds);

    // Aguardar conexão
    await new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (connectionStatus === "connected") {
          clearInterval(checkConnection);
          resolve(null);
        }
      }, 100);

      // Timeout de 60 segundos
      setTimeout(() => {
        clearInterval(checkConnection);
        if (connectionStatus !== "connected") {
          isConnecting = false;
          throw new Error("Timeout ao conectar WhatsApp");
        }
      }, 60000);
    });

    return sock;
  } catch (error) {
    isConnecting = false;
    connectionStatus = "disconnected";
    sock = null;
    console.error("[WhatsApp] Erro ao inicializar Baileys:", error);
    throw error;
  }
}

export async function sendMessage(phoneNumber: string, message: string) {
  if (!sock || connectionStatus !== "connected") {
    throw new Error("WhatsApp não está conectado");
  }

  try {
    // Formatar número para WhatsApp
    const jid = phoneNumber.includes("@") ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

    const response = await sock.sendMessage(jid, {
      text: message,
    });

    console.log(`[WhatsApp] Mensagem enviada para ${phoneNumber}`);
    return response;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao enviar mensagem para ${phoneNumber}:`, error);
    throw error;
  }
}

export function getConnectionStatus() {
  return {
    status: connectionStatus,
    isConnecting,
    qrCode: qrCodeData,
  };
}

export function getQRCode() {
  return qrCodeData;
}

export async function disconnectWhatsApp() {
  if (sock) {
    await sock.logout();
    sock = null;
    connectionStatus = "disconnected";
    qrCodeData = null;
    console.log("[WhatsApp] Desconectado");
  }
}

export function isConnected() {
  return connectionStatus === "connected" && sock !== null;
}
