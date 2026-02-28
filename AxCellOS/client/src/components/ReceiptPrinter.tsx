import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { formatPhoneBR } from '@/lib/utils';

export interface ReceiptData {
  id: string;
  date: Date;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  netValue?: number;
  feePercent?: number;
  paymentMethod: string;
  installments?: number;
  customerName?: string;
  customerCPF?: string;
}

interface ReceiptPrinterProps {
  data: ReceiptData;
  format: '58mm' | '80mm';
}

export function ReceiptPrinter({ data, format }: ReceiptPrinterProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { data: companySetting } = trpc.settings.getSetting.useQuery({ key: 'company' });
  const companyData = companySetting?.value as any;

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const company = {
      name: companyData?.name || 'AxCellOS',
      cnpj: companyData?.cnpj || '00.000.000/0000-00',
      phone: formatPhoneBR(companyData?.phone) || '(55) 00 00000-0000',
      address: companyData?.address || 'Rua Principal, 123',
      city: companyData?.city || 'Cidade',
      state: companyData?.state || 'UF',
      zipCode: companyData?.zipCode || '00000-000',
    };

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom Fiscal</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              background: white;
            }
            .receipt {
              width: ${format === '58mm' ? '58mm' : '80mm'};
              margin: 0 auto;
              padding: 4mm;
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 4mm;
              margin-bottom: 4mm;
            }
            .header h1 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            .header p {
              font-size: 10px;
              margin: 1mm 0;
            }
            .receipt-number {
              font-size: 11px;
              font-weight: bold;
              margin: 2mm 0;
            }
            .items {
              margin: 4mm 0;
              border-bottom: 2px dashed #000;
              padding-bottom: 4mm;
            }
            .item {
              font-size: 10px;
              margin-bottom: 2mm;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            .item-name {
              flex: 1;
              font-weight: bold;
            }
            .item-qty {
              margin: 0 2mm;
            }
            .item-price {
              font-weight: bold;
              text-align: right;
            }
            .totals {
              margin: 4mm 0;
              border-bottom: 2px dashed #000;
              padding-bottom: 4mm;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 2mm;
            }
            .total-row.grand-total {
              font-weight: bold;
              font-size: 12px;
              margin-top: 2mm;
            }
            .payment {
              text-align: center;
              font-size: 10px;
              margin: 4mm 0;
              padding: 2mm 0;
              border-bottom: 2px dashed #000;
              border-top: 2px dashed #000;
            }
            .customer-info {
              font-size: 10px;
              margin: 4mm 0;
              padding: 2mm 0;
              border-bottom: 2px dashed #000;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              margin-top: 4mm;
              padding-top: 2mm;
            }
            .footer p {
              margin: 1mm 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .receipt {
                margin: 0;
                padding: 0;
                width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>🛍️ ${company.name}</h1>
              <p>${company.address}</p>
              <p>${company.city} - ${company.state}</p>
              <p>CNPJ: ${company.cnpj}</p>
              <p>Tel: ${company.phone}</p>
            </div>

            <div class="receipt-number">
              Cupom: ${data.id}
            </div>
            <div style="font-size: 10px; text-align: center; margin-bottom: 4mm;">
              ${new Date(data.date).toLocaleString('pt-BR')}
            </div>

            ${data.customerName || data.customerCPF ? `
              <div class="customer-info">
                <strong>Cliente:</strong> ${data.customerName || 'N/A'}<br/>
                <strong>CPF:</strong> ${data.customerCPF || 'N/A'}
              </div>
            ` : ''}

            <div class="items">
              ${data.items.map(item => `
                <div class="item">
                  <div class="item-name">${item.name}</div>
                  <div style="font-size: 10px;">
                    ${item.quantity}x R$ ${item.price.toFixed(2)}
                  </div>
                </div>
                <div style="text-align: right; font-size: 10px; font-weight: bold; width: 100%; margin-bottom: 2mm;">
                  R$ ${item.total.toFixed(2)}
                </div>
              `).join('')}
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>R$ ${data.subtotal.toFixed(2)}</span>
              </div>
              ${data.tax > 0 ? `
                <div class="total-row">
                  <span>Impostos:</span>
                  <span>R$ ${data.tax.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>R$ ${data.total.toFixed(2)}</span>
              </div>
            </div>

            <div class="payment">
              <strong>Forma de Pagamento:</strong><br/>
              ${data.paymentMethod.toUpperCase()}
            </div>

            <div class="footer">
              <p>Obrigado pela compra!</p>
              <p>Volte sempre!</p>
              <p style="margin-top: 4mm; font-size: 8px;">
                ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Button
      onClick={handlePrint}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Printer className="w-4 h-4" />
      Imprimir Cupom ({format})
    </Button>
  );
}
