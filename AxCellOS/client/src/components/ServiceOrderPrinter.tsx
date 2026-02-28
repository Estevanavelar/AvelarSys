import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/contexts/OrdersContext';
import { trpc } from '@/lib/trpc';
import { formatPhoneBR } from '@/lib/utils';
import { isPatternLock } from './PatternLock';

/** Gera SVG do padrão para impressão (grid 3x3, ids 1-9) com ordem numerada */
function patternSvgForPrint(pattern: string, size = 80): string {
  const pad = 12;
  const spacing = (size - pad * 2) / 2;
  const dotR = 4;
  const ringR = 10;
  const dots: { id: number; cx: number; cy: number }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      dots.push({ id: row * 3 + col + 1, cx: pad + col * spacing, cy: pad + row * spacing });
    }
  }
  const dotById = (id: number) => dots.find((d) => d.id === id)!;
  const seq = pattern.split('').map(Number).filter((d) => d >= 1 && d <= 9);

  const lines = seq.length > 1
    ? seq.slice(1).map((id, i) => {
        const a = dotById(seq[i]);
        const b = dotById(id);
        return `<line x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>`;
      }).join('')
    : '';

  const circles = dots.map((dot) => {
    const idx = seq.indexOf(dot.id);
    const isActive = idx >= 0;
    const orderNum = idx >= 0 ? idx + 1 : 0;
    return `<circle cx="${dot.cx}" cy="${dot.cy}" r="${ringR}" fill="none" stroke="${isActive ? '#f97316' : '#ccc'}" stroke-width="${isActive ? 2 : 1}" opacity="${isActive ? 0.9 : 0.4}"/>
      ${isActive ? `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dotR}" fill="#f97316"/>
        <text x="${dot.cx}" y="${dot.cy - ringR - 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="#f97316">${orderNum}</text>` : ''}`;
  }).join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;margin-top:2mm;">
    ${lines}
    ${circles}
  </svg>`;
}

interface ServiceOrderPrinterProps {
  order: ServiceOrder;
}

export function ServiceOrderPrinter({ order }: ServiceOrderPrinterProps) {
  const { data: companySetting } = trpc.settings.getSetting.useQuery({ key: 'company' });
  const companyData = companySetting?.value as any;
  const { data: warrantyTermsList } = trpc.settings.getWarrantyTerms.useQuery();

  const handlePrint = () => {
    const company = {
      name: companyData?.name || 'AxCellOS',
      cnpj: companyData?.cnpj || '00.000.000/0000-00',
      phone: formatPhoneBR(companyData?.phone) || '(55) 00 00000-0000',
      address: companyData?.address || 'Rua Principal, 123',
      city: companyData?.city || 'Cidade',
      state: companyData?.state || 'UF',
      zipCode: companyData?.zipCode || '00000-000',
      email: companyData?.email || '',
    };

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço - ${order.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; padding: 10mm; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 5mm; }
            .company-info h1 { font-size: 24px; margin-bottom: 2mm; }
            .company-info p { font-size: 12px; line-height: 1.4; }
            .os-info { text-align: right; }
            .os-info h2 { font-size: 20px; color: #666; }
            .os-info p { font-size: 14px; font-weight: bold; margin-top: 2mm; }
            
            .section { margin-bottom: 6mm; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; background: #eee; padding: 2mm; margin-bottom: 3mm; border-left: 4px solid #000; }
            
            .grid { display: grid; grid-template-cols: 1fr 1px 1fr; gap: 5mm; }
            .col { padding: 0 2mm; }
            .divider { background: #ddd; }
            
            .field { margin-bottom: 3mm; }
            .label { font-size: 10px; font-weight: bold; color: #777; text-transform: uppercase; }
            .value { font-size: 13px; font-weight: bold; }
            
            .details-table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
            .details-table th { text-align: left; font-size: 11px; padding: 2mm; border-bottom: 1px solid #000; }
            .details-table td { padding: 3mm 2mm; border-bottom: 1px solid #eee; font-size: 12px; }
            
            .footer { margin-top: 15mm; border-top: 1px solid #ddd; pt: 5mm; }
            .signatures { display: grid; grid-template-cols: 1fr 1fr; gap: 20mm; margin-top: 15mm; }
            .signature-line { border-top: 1px solid #000; text-align: center; padding-top: 2mm; font-size: 11px; }
            .terms-section { margin-bottom: 6mm; }
            .term-block { margin-bottom: 4mm; }
            .term-title { font-size: 12px; font-weight: bold; margin-bottom: 2mm; }
            .term-content { font-size: 11px; line-height: 1.4; }
            .term-content ul, .term-content ol { margin: 2mm 0 2mm 5mm; padding-left: 4mm; }
            .term-content strong { font-weight: bold; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>${company.name}</h1>
              <p>${company.address}</p>
              <p>${company.city} - ${company.state} | CEP: ${company.zipCode}</p>
              <p>CNPJ: ${company.cnpj} | Tel: ${company.phone}</p>
              ${company.email ? `<p>Email: ${company.email}</p>` : ''}
            </div>
            <div class="os-info">
              <h2>ORDEM DE SERVIÇO</h2>
              <p>Nº ${order.orderNumber}</p>
              <p style="font-size: 12px; font-weight: normal; color: #888;">Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados do Cliente</div>
            <div class="grid">
              <div class="col">
                <div class="field">
                  <div class="label">Nome / Razão Social</div>
                  <div class="value">${order.customerName}</div>
                </div>
                <div class="field">
                  <div class="label">Telefone / WhatsApp</div>
                  <div class="value">${order.customerPhone}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Equipamento / Dispositivo</div>
            <div class="grid">
              <div class="col">
                <div class="field">
                  <div class="label">Marca / Modelo</div>
                  <div class="value">${order.deviceBrand} ${order.deviceModel}</div>
                </div>
                <div class="field">
                  <div class="label">Defeito Relatado</div>
                  <div class="value">${order.defect}</div>
                </div>
                ${order.warrantyUntil ? `
                <div class="field">
                  <div class="label">Garantia</div>
                  <div class="value">Válida até ${new Date(order.warrantyUntil).toLocaleDateString('pt-BR')}</div>
                </div>
                ` : ''}
              </div>
            </div>
            ${order.devicePassword ? `
            <div class="field" style="margin-top: 4mm;">
              <div class="label">Senha do aparelho (PIN / padrão)</div>
              ${isPatternLock(order.devicePassword)
                ? `<div style="margin-top: 2mm;">${patternSvgForPrint(order.devicePassword)}</div>`
                : `<div class="value" style="letter-spacing: 0.15em;">${String(order.devicePassword).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
              }
            </div>
            ` : ''}
            ${(function() {
              const m = order.notes?.match(/Checklist:\s*Sinal de vida:\s*(\S+)\s*\|\s*Consumo carga:\s*(\S+)\s*\|\s*Sem chip[^:]*:\s*(\S+)/i);
              if (!m) return '';
              const [, life, charge, accessories] = m;
              const fmt = (v: string) => (v === 'sim' || v === 'nao' ? v.charAt(0).toUpperCase() + v.slice(1) : v || '-');
              return `
            <div class="field" style="margin-top: 6mm; padding-top: 4mm; border-top: 1px solid #eee;">
              <div class="label" style="margin-bottom: 3mm;">Checklist Rápido</div>
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 2mm 6mm 2mm 0;"><strong>Sinal de vida?</strong> ${fmt(life)}</td>
                  <td style="padding: 2mm 6mm 2mm 0;"><strong>Consumo de carga?</strong> ${fmt(charge)}</td>
                  <td style="padding: 2mm 0;"><strong>Sem chip/cartão/capa?</strong> ${fmt(accessories)}</td>
                </tr>
              </table>
            </div>
            `;
            })()}
          </div>

          ${(function() {
            const m = order.notes?.match(/(?:Peças|Pecas):\s*(.+?)(?:\s*\||$)/i);
            const parts = m?.[1]?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
            if (parts.length === 0) return '';
            const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
          <div class="section">
            <div class="section-title">Peças Solicitadas</div>
            <ul style="list-style: disc; padding-left: 5mm; font-size: 12px;">
              ${parts.map(p => `<li>${esc(p)}</li>`).join('')}
            </ul>
          </div>
          `;
          })()}

          <div class="section">
            <div class="section-title">Resumo Financeiro</div>
            <div class="field">
              <div class="label">Valor Total</div>
              <div class="value" style="font-size: 16px;">${order.totalValue != null ? `R$ ${Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (order.estimatedCost || 'R$ 0,00')}</div>
            </div>
            <div class="field" style="margin-top: 2mm;">
              <div class="label">Forma de Pagamento</div>
              <div class="value">${order.paymentInfo?.method ? String(order.paymentInfo.method).charAt(0).toUpperCase() + String(order.paymentInfo.method).slice(1).toLowerCase() : 'A definir'}</div>
            </div>
          </div>

          ${(function() {
            const ids = order.warrantyTermIds;
            const list = warrantyTermsList || [];
            if (!ids || ids.length === 0 || list.length === 0) return '';
            const selected = list.filter(function(t) { return ids.indexOf(t.id) >= 0; });
            if (selected.length === 0) return '';
            const esc = function(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
            return '<div class="section terms-section"><div class="section-title">Termos de Garantia</div>' +
              selected.map(function(term) {
                return '<div class="term-block"><div class="term-title">' + esc(term.title) + '</div><div class="term-content">' + term.content + '</div></div>';
              }).join('') + '</div>';
          })()}

          <div class="footer">
            <p style="font-size: 10px; color: #999; text-align: center; margin-bottom: 10mm;">
              Este documento é um comprovante de entrada de equipamento para manutenção. 
              Garantia de 90 dias apenas para o serviço executado.
            </p>
            <div class="signatures">
              <div class="signature-line">Assinatura do Cliente</div>
              <div class="signature-line">Assinatura do Responsável</div>
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
      className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-14 font-black text-base shadow-lg shadow-primary/20 transition-all active:scale-95 gap-2"
    >
      <Printer className="w-5 h-5" />
      Imprimir Ordem de Serviço
    </Button>
  );
}
