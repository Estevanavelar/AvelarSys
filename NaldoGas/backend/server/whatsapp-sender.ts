import { sendMessage, isConnected } from "./baileys-manager";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { whatsappMessageTemplates } from "../drizzle/schema";

interface MessageVariables {
  customerName?: string;
  totalAmount?: string;
  productList?: string;
  paymentMethod?: string;
  saleChannel?: string;
  address?: string;
  deliveryDate?: string;
  dueAmount?: string;
  dueDate?: string;
  productName?: string;
  currentStock?: string;
  minStock?: string;
}

// Função para substituir variáveis na mensagem
function replaceVariables(template: string, variables: MessageVariables): string {
  let message = template;

  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      const regex = new RegExp(`{${key}}`, "g");
      message = message.replace(regex, String(value));
    }
  });

  return message;
}

// Obter template de mensagem
async function getTemplate(templateType: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const template = await db
    .select()
    .from(whatsappMessageTemplates)
    .where(eq(whatsappMessageTemplates.templateType, templateType))
    .limit(1);

  return template[0] || null;
}

// Enviar mensagem de venda
export async function sendSaleNotification(
  phoneNumber: string,
  customerName: string,
  totalAmount: string,
  productList: string,
  paymentMethod: string,
  saleChannel: string
) {
  if (!isConnected()) {
    console.warn("[WhatsApp] Sistema não conectado, notificação não será enviada");
    return { success: false, error: "WhatsApp não está conectado" };
  }

  try {
    const template = await getTemplate("sale");
    if (!template) {
      console.warn("[WhatsApp] Template de venda não encontrado");
      return { success: false, error: "Template não encontrado" };
    }

    const message = replaceVariables(template.messageContent, {
      customerName,
      totalAmount,
      productList,
      paymentMethod,
      saleChannel,
    });

    await sendMessage(phoneNumber, message);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar notificação de venda:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Enviar mensagem de entrega pendente
export async function sendDeliveryNotification(
  phoneNumber: string,
  customerName: string,
  address: string,
  deliveryDate: string,
  totalAmount: string
) {
  if (!isConnected()) {
    console.warn("[WhatsApp] Sistema não conectado, notificação não será enviada");
    return { success: false, error: "WhatsApp não está conectado" };
  }

  try {
    const template = await getTemplate("delivery");
    if (!template) {
      console.warn("[WhatsApp] Template de entrega não encontrado");
      return { success: false, error: "Template não encontrado" };
    }

    const message = replaceVariables(template.messageContent, {
      customerName,
      address,
      deliveryDate,
      totalAmount,
    });

    await sendMessage(phoneNumber, message);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar notificação de entrega:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Enviar lembrete de pagamento
export async function sendPaymentReminder(
  phoneNumber: string,
  customerName: string,
  dueAmount: string,
  dueDate: string
) {
  if (!isConnected()) {
    console.warn("[WhatsApp] Sistema não conectado, notificação não será enviada");
    return { success: false, error: "WhatsApp não está conectado" };
  }

  try {
    const template = await getTemplate("reminder");
    if (!template) {
      console.warn("[WhatsApp] Template de lembrete não encontrado");
      return { success: false, error: "Template não encontrado" };
    }

    const message = replaceVariables(template.messageContent, {
      customerName,
      dueAmount,
      dueDate,
    });

    await sendMessage(phoneNumber, message);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar lembrete de pagamento:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Enviar alerta de estoque baixo
export async function sendLowStockAlert(
  phoneNumber: string,
  productName: string,
  currentStock: string,
  minStock: string
) {
  if (!isConnected()) {
    console.warn("[WhatsApp] Sistema não conectado, notificação não será enviada");
    return { success: false, error: "WhatsApp não está conectado" };
  }

  try {
    const template = await getTemplate("stock");
    if (!template) {
      console.warn("[WhatsApp] Template de estoque não encontrado");
      return { success: false, error: "Template não encontrado" };
    }

    const message = replaceVariables(template.messageContent, {
      productName,
      currentStock,
      minStock,
    });

    await sendMessage(phoneNumber, message);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar alerta de estoque:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
