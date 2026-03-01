import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { 
  User as UserIcon, AlertCircle as AlertIcon, 
  Wrench as WrenchIcon, DollarSign as DollarIcon, 
  Calculator as CalculatorIcon, Smartphone as SmartphoneIcon, Plus as PlusIcon,
  Clock as ClockIcon, ClipboardList, Info, Check, ChevronDown, Loader2, Lock, FileCheck
} from 'lucide-react';
import { useOrders, ServiceOrder } from '@/contexts/OrdersContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { listAddresses, createPurchaseOrder } from '@/lib/stocktech';
import { formatCpf, formatPhone } from '@/lib/utils';
import StockTechPartsSelector, { type SelectedPart } from './StockTechPartsSelector';
import PatternLock, { encodePatternLock } from './PatternLock';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const { addOrder } = useOrders();
  const utils = trpc.useUtils();
  const createFinalCustomer = trpc.customers.createFinalCustomer.useMutation();
  const createCustomerDevice = trpc.devices.createCustomerDevice.useMutation();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    device: '',
    defect: '',
    parts: '',
    labor: '',
    total: '',
    cost: '',
    warrantyDays: '90', // Default 90 days
    devicePassword: '', // PIN/senha digitada
    devicePattern: '', // Padrão desenhado (não aparece no input)
    deviceCheckLife: '' as '' | 'sim' | 'nao',      // Aparelho dá sinal de vida?
    deviceCheckCharge: '' as '' | 'sim' | 'nao',    // Dá consumo de carga?
    deviceCheckAccessories: '' as '' | 'sim' | 'nao', // Sem chip, cartão M. ou capa?
  });
  const [customerForm, setCustomerForm] = useState({
    fullName: '',
    cpf: '',
    whatsapp: '',
  });
  const [deviceForm, setDeviceForm] = useState({
    customerCpf: '',
    brand: '',
    model: '',
  });
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [selectedWarrantyTerms, setSelectedWarrantyTerms] = useState<string[]>([]);
  const [costManualOverride, setCostManualOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSections, setOpenSections] = useState({
    identification: true, // Dados do cliente aberto por padrão
    serviceDetails: false,
    budget: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[key];
      if (isCurrentlyOpen) {
        return { ...prev, [key]: false };
      }
      return {
        identification: key === 'identification',
        serviceDetails: key === 'serviceDetails',
        budget: key === 'budget',
      };
    });
  };

  const parseMoneyInput = (value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatMoneyBR = (value: number) => value.toFixed(2).replace('.', ',');

  const handleCustomerChange = (value: string) => {
    setFormData({ ...formData, customer: formatCpf(value) });
  };

  const customerCpf = useMemo(() => {
    const digits = formData.customer.replace(/\D/g, '');
    return digits.length === 11 ? digits : undefined;
  }, [formData.customer]);

  const customerQuery = trpc.customers.getCustomer.useQuery(
    { id: customerCpf || '' },
    {
      enabled: Boolean(customerCpf),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const customerDevicesQuery = trpc.devices.getCustomerDevices.useQuery(
    { customerCpf: customerCpf || '' },
    {
      enabled: Boolean(customerCpf),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const { data: warrantyTerms = [] } = trpc.settings.getWarrantyTerms.useQuery();

  const computedPartsCost = useMemo(
    () => selectedParts.reduce((s, p) => s + p.price * p.quantity, 0),
    [selectedParts]
  );

  const computedTotal = useMemo(() => {
    const laborValue = parseMoneyInput(formData.labor);
    const costValue = parseMoneyInput(formData.cost);
    return laborValue + costValue;
  }, [formData.labor, formData.cost]);

  useEffect(() => {
    if (!costManualOverride && selectedParts.length > 0) {
      setFormData((prev) => ({ ...prev, cost: formatMoneyBR(computedPartsCost) }));
    }
  }, [computedPartsCost, costManualOverride, selectedParts.length]);

  useEffect(() => {
    if (!open) setSelectedWarrantyTerms([]);
  }, [open]);

  useEffect(() => {
    if (!customerCpf) return;
    console.info('[OS][Cliente] Buscando CPF informado:', customerCpf);
  }, [customerCpf]);

  useEffect(() => {
    if (!customerCpf) return;

    if (customerQuery.isSuccess && customerQuery.data) {
      console.info('[OS][Cliente] Cliente carregado com sucesso:', {
        cpf: customerCpf,
        nome: customerQuery.data.name,
        whatsapp: customerQuery.data.whatsapp,
      });
    }

    if (customerQuery.isError) {
      console.warn('[OS][Cliente] Falha ao buscar cliente por CPF:', {
        cpf: customerCpf,
        erro: (customerQuery.error as any)?.message || 'Erro desconhecido',
      });
    }
  }, [
    customerCpf,
    customerQuery.isSuccess,
    customerQuery.isError,
    customerQuery.data,
    customerQuery.error,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.info('[OS][Submit] Iniciando criacao da ordem', {
        customerCpf,
        customerInput: formData.customer,
        device: formData.device,
      });
    
      const days = parseInt(formData.warrantyDays) || 0;
    const warrantyUntil = days > 0 
      ? new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000)
      : null;

    const selectedWarrantyTermObjects = warrantyTerms.filter((term) =>
      selectedWarrantyTerms.includes(term.id)
    );

    const newOrder: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt'> = {
      customerCpf: customerCpf,
      customerName: customerQuery.data?.name || formData.customer,
      customerPhone: customerQuery.data?.whatsapp || '',
      customerEmail: undefined,
      deviceBrand: formData.device.split(' ')[0] || '',
      deviceModel: formData.device.split(' ').slice(1).join(' ') || '',
      defect: formData.defect,
      status: 'NA BANCADA',
      warrantyUntil,
      totalValue: computedTotal,
      emoji: '🛠️',
      devicePassword: (() => {
        const typedPassword = formData.devicePassword.trim();
        if (typedPassword) return typedPassword;
        if (formData.devicePattern) return encodePatternLock(formData.devicePattern);
        return undefined;
      })(),
      notes: [
        customerQuery.data?.name ? `Cliente: ${customerQuery.data.name}` : null,
        customerQuery.data?.whatsapp ? `WhatsApp: ${customerQuery.data.whatsapp}` : null,
        selectedParts.length > 0
          ? `Peças: ${selectedParts.map((p) => p.name).join(", ")}`
          : null,
        formData.labor ? `Mão de obra: ${formData.labor}` : null,
        formData.cost ? `Custo peça: ${formData.cost}` : null,
        (formData.deviceCheckLife || formData.deviceCheckCharge || formData.deviceCheckAccessories)
          ? `Checklist: Sinal de vida: ${formData.deviceCheckLife || '-'} | Consumo carga: ${formData.deviceCheckCharge || '-'} | Sem chip/capa: ${formData.deviceCheckAccessories || '-'}`
          : null,
        selectedWarrantyTermObjects.length > 0
          ? `Termos de garantia: ${selectedWarrantyTermObjects.map((term) => `${term.title} [${term.id}]`).join(' | ')}`
          : null,
      ]
        .filter(Boolean)
        .join(' | ') || undefined,
      warrantyTermIds: selectedWarrantyTerms,
    };

    const devicePayload = (() => {
      if (!customerCpf || !formData.device.trim()) return null;
      const [brandRaw, ...modelParts] = formData.device.trim().toUpperCase().split(' ');
      const modelRaw = modelParts.join(' ').trim();
      if (!brandRaw || !modelRaw) return null;
      return {
        customerCpf,
        brand: brandRaw,
        model: modelRaw,
      };
    })();

      const created = await addOrder(newOrder);
      console.info('[OS][Submit] Ordem enviada para criacao com sucesso');

      // Snapshot das peças para processar compra sem depender do estado atual do formulário.
      const partsSnapshot = [...selectedParts];
      const orderNumber = created?.orderNumber ?? "";
      // CPF usado na ordem — guardado antes de limpar o form para o refetch em background.
      const cpfUsedForOrder = customerCpf;

      // Fecha imediatamente após salvar a OS para UX mais rápida.
      setFormData({ customer: '', device: '', defect: '', parts: '', labor: '', total: '', cost: '', warrantyDays: '90', devicePassword: '', devicePattern: '', deviceCheckLife: '', deviceCheckCharge: '', deviceCheckAccessories: '' });
      setSelectedParts([]);
      setSelectedWarrantyTerms([]);
      setCostManualOverride(false);
      onOpenChange(false);

      // Vincula aparelho ao cliente em background (não bloqueia fechamento do modal).
      if (devicePayload) {
        void (async () => {
          try {
            await createCustomerDevice.mutateAsync(devicePayload);
            // Refetch com o CPF da ordem (o form já foi limpo, então não usar customerDevicesQuery.refetch()).
            if (cpfUsedForOrder) {
              await utils.devices.getCustomerDevices.fetch({ customerCpf: cpfUsedForOrder });
            }
          } catch (error: any) {
            console.warn('[OS][Device] Falha ao vincular aparelho em background:', error);
            toast.warning(error?.message || 'OS salva, mas não foi possível vincular o aparelho ao cliente.');
          }
        })();
      }

      // Compra no StockTech em background (não bloqueia fechamento do modal).
      if (partsSnapshot.length > 0) {
        void (async () => {
          try {
            const addresses = await listAddresses();
            const defaultAddr = addresses.find((a) => a.isDefault === 1) ?? addresses[0];
            if (defaultAddr) {
              const result = await createPurchaseOrder({
                items: partsSnapshot.map((p) => ({
                  productId: p.productId,
                  productName: p.name,
                  price: p.price.toFixed(2),
                  quantity: p.quantity,
                  sellerId: p.sellerId,
                  sellerName: p.sellerName,
                })),
                addressId: defaultAddr.id,
                freightOption: "standard",
                notes: `Compra automática via OS ${orderNumber}`.trim(),
              });
              const codes = result.orders?.map((o) => o.orderCode).filter(Boolean);
              if (codes?.length) {
                toast.success(`Pedido StockTech criado: ${codes.join(", ")}`);
              } else {
                toast.success("Pedido de compra criado no StockTech.");
              }
            } else {
              toast.warning("Nenhum endereço cadastrado. Cadastre um endereço no StockTech para criar o pedido de compra.");
            }
          } catch (err) {
            toast.warning(
              err instanceof Error ? err.message : "Falha ao criar pedido no StockTech. A OS foi salva."
            );
          }
        })();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpf = customerForm.cpf.replace(/\D/g, '');
    const whatsapp = customerForm.whatsapp.replace(/\D/g, '');

    if (!customerForm.fullName.trim()) {
      alert('Informe o nome completo do cliente.');
      return;
    }
    if (cpf.length !== 11) {
      alert('CPF inválido. Informe 11 dígitos.');
      return;
    }
    if (whatsapp.length < 10) {
      alert('WhatsApp inválido.');
      return;
    }

    try {
      const created = await createFinalCustomer.mutateAsync({
        fullName: customerForm.fullName.trim(),
        cpf,
        whatsapp,
      });

      setFormData(prev => ({
        ...prev,
        customer: formatCpf(created.cpf),
      }));
      setCustomerForm({ fullName: '', cpf: '', whatsapp: '' });
      setCustomerDialogOpen(false);
    } catch (error: any) {
      alert(error?.message || 'Falha ao salvar cliente.');
    }
  };

  // Preencher CPF do cliente ao abrir modal de aparelho
  useEffect(() => {
    if (deviceDialogOpen && formData.customer) {
      const digits = formData.customer.replace(/\D/g, '');
      if (digits.length === 11) {
        setDeviceForm((prev) => ({ ...prev, customerCpf: formatCpf(digits) }));
      }
    } else if (!deviceDialogOpen) {
      setDeviceForm({ customerCpf: '', brand: '', model: '' });
    }
  }, [deviceDialogOpen, formData.customer]);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = deviceForm.customerCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      alert('CPF inválido. Informe 11 dígitos.');
      return;
    }

    const deviceLabel = `${deviceForm.brand} ${deviceForm.model}`.trim();
    setFormData(prev => ({
      ...prev,
      device: deviceLabel,
      customer: prev.customer || formatCpf(cleanCpf),
    }));

    // Persiste no backend para ficar compartilhado entre máquinas/usuários
    try {
      await createCustomerDevice.mutateAsync({
        customerCpf: cleanCpf,
        brand: deviceForm.brand.trim(),
        model: deviceForm.model.trim(),
      });
      await customerDevicesQuery.refetch();
    } catch (error: any) {
      alert(error?.message || 'Falha ao salvar aparelho do cliente.');
      return;
    }

    setDeviceForm({ customerCpf: '', brand: '', model: '' });
    setDeviceDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!flex !flex-col w-[97vw] max-w-[97vw] h-[97vh] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl gap-0">
          {/* Header */}
          <div className="bg-primary/5 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-primary/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2.5 rounded-xl text-primary shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">
                  Nova Ordem de Serviço
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs font-medium truncate">
                  Registre a entrada de um novo aparelho para manutenção
                </DialogDescription>
              </div>
            </div>
          </div>

          <form id="create-order-form" onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            {/* SEÇÃO 1: IDENTIFICAÇÃO */}
            <Collapsible open={openSections.identification} onOpenChange={() => toggleSection('identification')}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/15 p-2 rounded-xl text-primary">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">Identificação</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">Cliente e aparelho</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.customer && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full hidden sm:inline">
                        {formData.customer}
                      </span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${openSections.identification ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-2 data-[state=open]:slide-down-2">
                <div className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-muted/20 p-5 rounded-[20px] border border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="customer" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        CPF do Cliente
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="customer"
                            type="text"
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            value={formData.customer}
                            onChange={(e) => handleCustomerChange(e.target.value)}
                            className="rounded-xl h-12 pl-11 font-bold bg-background border-border/50 focus:bg-background transition-all font-mono"
                            maxLength={14}
                            required
                          />
                          <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setCustomerDialogOpen(true)}
                          className="rounded-xl h-12 w-12 p-0 shrink-0 border border-border/50 hover:bg-primary/10 hover:text-primary transition-all"
                          title="Cadastrar Novo Cliente"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </Button>
                      </div>
                      {customerCpf && customerQuery.data && (
                        <div className="mt-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs">
                          <p className="font-semibold text-foreground leading-tight">{customerQuery.data.name}</p>
                          <p className="text-muted-foreground leading-tight mt-1">
                            WhatsApp: {customerQuery.data.whatsapp || 'não informado'}
                          </p>
                        </div>
                      )}
                      {customerCpf && customerQuery.isError && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          CPF não encontrado. Use o botão + para cadastro rápido.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="device" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Aparelho / Modelo
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="device"
                            placeholder="Ex: iPhone 14 Pro Max"
                            value={formData.device}
                            onChange={(e) => setFormData({ ...formData, device: e.target.value.toUpperCase() })}
                            className="rounded-xl h-12 pl-11 font-bold uppercase bg-background border-border/50 focus:bg-background transition-all"
                            required
                          />
                          <SmartphoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setDeviceDialogOpen(true)}
                          className="rounded-xl h-12 w-12 p-0 shrink-0 border border-border/50 hover:bg-primary/10 hover:text-primary transition-all"
                          title="Vincular Novo Aparelho"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </Button>
                      </div>
                      {customerCpf && (customerDevicesQuery.data?.length || 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {customerDevicesQuery.data!.slice(0, 6).map((device: { id: string; deviceLabel: string; source?: 'local' | 'global' }) => (
                            <button
                              key={device.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, device: device.deviceLabel })}
                              className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-background hover:bg-primary/10 hover:border-primary/40 transition-colors"
                              title={`${device.deviceLabel} (${device.source === 'global' ? 'GLOBAL' : 'LOCAL'})`}
                            >
                              {device.deviceLabel} {device.source === 'global' ? '🌐' : '🏪'}
                            </button>
                          ))}
                        </div>
                      )}
                      {customerCpf && customerDevicesQuery.isSuccess && (customerDevicesQuery.data?.length || 0) === 0 && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Nenhum aparelho cadastrado para este cliente. Digite e salve para cadastrar automaticamente.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SEÇÃO 2: DETALHES TÉCNICOS - forceMount para buscar peças ao selecionar aparelho mesmo com seção fechada */}
            <Collapsible open={openSections.serviceDetails} onOpenChange={() => toggleSection('serviceDetails')}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-destructive/15 p-2 rounded-xl text-destructive">
                      <AlertIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">Detalhes do Serviço</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">Defeito, senha, checklist e peças</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.defect && (
                      <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full hidden sm:inline truncate max-w-[120px]">
                        {formData.defect.slice(0, 20)}{formData.defect.length > 20 ? '...' : ''}
                      </span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${openSections.serviceDetails ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent forceMount className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-2 data-[state=open]:slide-down-2 data-[state=closed]:hidden">
                <div className="pt-3">
                  <div className="space-y-5 bg-muted/20 p-5 rounded-[20px] border border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="defect" className="text-[10px] font-black uppercase tracking-widest text-destructive ml-1">
                        Defeito Relatado / Problema
                      </Label>
                      <Textarea
                        id="defect"
                        placeholder="Descreva detalhadamente o que o cliente relatou..."
                        value={formData.defect}
                        onChange={(e) => setFormData({ ...formData, defect: e.target.value })}
                        className="rounded-xl min-h-28 resize-none bg-background border-border/50 focus:bg-background transition-all p-4 leading-relaxed font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        Senha do Aparelho
                      </Label>
                      <div className="flex flex-col sm:flex-row gap-5">
                        <div className="flex-1 space-y-2">
                          <div className="relative">
                            <Input
                              id="devicePassword"
                              type="text"
                              placeholder="PIN ou senha do celular (ex: 1234)"
                              value={formData.devicePassword}
                              onChange={(e) => setFormData({ ...formData, devicePassword: e.target.value })}
                              className="rounded-xl h-12 pl-11 font-bold bg-background border-border/50 focus:bg-background transition-all font-mono"
                              maxLength={20}
                            />
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <PatternLock
                          value={formData.devicePattern}
                          onChange={(pattern) => setFormData({ ...formData, devicePattern: pattern })}
                        />
                      </div>

                      <div className="space-y-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5" />
                          Checklist rápido
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-foreground">Sinal de vida?</p>
                            <div className="flex gap-2">
                              <Button type="button" variant={formData.deviceCheckLife === 'sim' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-lg h-9" onClick={() => setFormData({ ...formData, deviceCheckLife: 'sim' })}>Sim</Button>
                              <Button type="button" variant={formData.deviceCheckLife === 'nao' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-lg h-9" onClick={() => setFormData({ ...formData, deviceCheckLife: 'nao' })}>Não</Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-foreground">Consumo de carga?</p>
                            <div className="flex gap-2">
                              <Button type="button" variant={formData.deviceCheckCharge === 'sim' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-lg h-9" onClick={() => setFormData({ ...formData, deviceCheckCharge: 'sim' })}>Sim</Button>
                              <Button type="button" variant={formData.deviceCheckCharge === 'nao' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-lg h-9" onClick={() => setFormData({ ...formData, deviceCheckCharge: 'nao' })}>Não</Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-foreground">Sem chip/cartão/capa?</p>
                            <div className="flex gap-2">
                              <Button type="button" variant={formData.deviceCheckAccessories === 'sim' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-lg h-9" onClick={() => setFormData({ ...formData, deviceCheckAccessories: 'sim' })}>Sim</Button>
                              <Button type="button" variant={formData.deviceCheckAccessories === 'nao' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-lg h-9" onClick={() => setFormData({ ...formData, deviceCheckAccessories: 'nao' })}>Não</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Peças Necessárias (Catálogo StockTech)
                      </Label>
                      <StockTechPartsSelector
                        deviceModel={formData.device}
                        selectedParts={selectedParts}
                        onPartsChange={(parts) => {
                          setSelectedParts(parts);
                          if (!costManualOverride) {
                            const sum = parts.reduce((s, p) => s + p.price * p.quantity, 0);
                            setFormData((prev) => ({ ...prev, cost: formatMoneyBR(sum) }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SEÇÃO 3: VALORES E GARANTIA */}
            <Collapsible open={openSections.budget} onOpenChange={() => toggleSection('budget')}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/15 p-2 rounded-xl text-green-600">
                      <DollarIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">Orçamento e Garantia</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">Mão de obra, custo peça e garantia</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {computedTotal > 0 && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full hidden sm:inline">
                        R$ {formatMoneyBR(computedTotal)}
                      </span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${openSections.budget ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-2 data-[state=open]:slide-down-2">
                <div className="pt-3">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/20 p-5 rounded-[20px] border border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="labor" className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">
                        Mão de Obra
                      </Label>
                      <div className="relative">
                        <Input
                          id="labor"
                          placeholder="0,00"
                          value={formData.labor}
                          onChange={(e) => setFormData({ ...formData, labor: e.target.value })}
                          className="rounded-xl h-12 pl-10 text-base font-black text-blue-600 bg-blue-500/5 focus:bg-background border-blue-500/20 transition-all"
                        />
                        <WrenchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cost" className="text-[10px] font-black uppercase tracking-widest text-orange-600 ml-1">
                          Custo Peça
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[9px] h-5 px-1.5"
                          onClick={() => setCostManualOverride((v) => !v)}
                        >
                          {costManualOverride ? "Auto" : "Manual"}
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="cost"
                          placeholder="0,00"
                          value={formData.cost}
                          onChange={(e) => {
                            setFormData({ ...formData, cost: e.target.value });
                            setCostManualOverride(true);
                          }}
                          readOnly={!costManualOverride}
                          className="rounded-xl h-12 pl-10 text-base font-black text-orange-600 bg-orange-500/5 focus:bg-background border-orange-500/20 transition-all"
                        />
                        <SmartphoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total" className="text-[10px] font-black uppercase tracking-widest text-green-600 ml-1">
                        Valor Total
                      </Label>
                      <div className="relative">
                        <Input
                          id="total"
                          placeholder="0,00"
                          value={formatMoneyBR(computedTotal)}
                          readOnly
                          className="rounded-xl h-12 pl-10 text-lg font-black text-green-600 bg-green-500/5 focus:bg-background border-green-500/20 transition-all"
                        />
                        <CalculatorIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="warranty" className="text-[10px] font-black uppercase tracking-widest text-purple-600 ml-1">
                        Garantia (Dias)
                      </Label>
                      <div className="relative">
                        <Input
                          id="warranty"
                          type="number"
                          placeholder="90"
                          value={formData.warrantyDays}
                          onChange={(e) => setFormData({ ...formData, warrantyDays: e.target.value })}
                          className="rounded-xl h-12 pl-10 font-black text-center text-base text-purple-600 bg-purple-500/5 border-purple-500/20 focus:bg-background transition-all"
                        />
                        <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
                      </div>
                    </div>

                    <div className="col-span-2 lg:col-span-4 space-y-2 pt-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <FileCheck className="w-3.5 h-3.5" />
                        Termos de Garantia (serão impressos na OS)
                      </Label>
                      {warrantyTerms.length > 0 ? (
                        <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-background/60 border border-border/50">
                          {warrantyTerms.map((term) => (
                            <label key={term.id} className="flex items-center gap-2 cursor-pointer group">
                              <Checkbox
                                checked={selectedWarrantyTerms.includes(term.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedWarrantyTerms((prev) =>
                                    checked ? [...prev, term.id] : prev.filter((t) => t !== term.id)
                                  );
                                }}
                                className="rounded border-border/60"
                              />
                              <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                {term.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-muted/30 border border-dashed border-border/50 text-center">
                          <p className="text-xs text-muted-foreground">
                            Nenhum termo cadastrado. Cadastre em <strong>Configurações → Termos de Garantia</strong> para que possam ser impressos na OS.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5 flex items-center gap-3">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-200 font-medium">
                Os valores e o defeito relatado serão impressos automaticamente na Ordem de Serviço de entrada.
              </p>
            </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-muted/20 flex flex-col-reverse sm:flex-row gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-2xl h-12 font-bold transition-all active:scale-95 border-border/50 hover:bg-background"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-order-form"
              disabled={isSubmitting}
              className="flex-[2] gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 font-black text-base shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  SALVANDO...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  GERAR ORDEM DE SERVIÇO
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Novo Cliente */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl flex flex-col">
          <div className="bg-primary/5 px-8 pt-8 pb-6 border-b border-primary/10 relative shrink-0">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-primary/20 p-3 rounded-2xl text-primary">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Novo Cliente
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium">
                  Cadastro rápido para vincular à OS
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="quick-customer-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
              <Input
                id="quick-customer-name"
                placeholder="Nome completo do cliente"
                value={customerForm.fullName}
                onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                className="rounded-xl h-12 bg-muted/30 focus:bg-background font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quick-customer-cpf" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF</Label>
                <Input
                  id="quick-customer-cpf"
                  placeholder="000.000.000-00"
                  value={customerForm.cpf}
                  onChange={(e) => setCustomerForm({ ...customerForm, cpf: formatCpf(e.target.value) })}
                  className="rounded-xl h-12 bg-muted/30 focus:bg-background font-mono"
                  maxLength={14}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-customer-whatsapp" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                <Input
                  id="quick-customer-whatsapp"
                  placeholder="(00) 00000-0000"
                  value={customerForm.whatsapp}
                  onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: formatPhone(e.target.value) })}
                  className="rounded-xl h-12 bg-muted/30 focus:bg-background font-bold"
                  maxLength={16}
                  required
                />
              </div>
            </div>
          </form>

          <div className="p-8 border-t bg-muted/20 flex gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerDialogOpen(false)}
              className="flex-1 rounded-2xl h-12 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                void handleCreateCustomer(e as any);
              }}
              disabled={createFinalCustomer.isPending}
              className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {createFinalCustomer.isPending ? 'SALVANDO...' : 'SALVAR CLIENTE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Novo Aparelho */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl flex flex-col">
          <div className="bg-primary/5 px-8 pt-8 pb-6 border-b border-primary/10 relative shrink-0">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-primary/20 p-3 rounded-2xl text-primary">
                <SmartphoneIcon className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Novo Aparelho
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium">
                  Identifique o equipamento do cliente
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateDevice} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="device-customer" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF do Cliente</Label>
              <Input
                id="device-customer"
                placeholder="000.000.000-00"
                value={deviceForm.customerCpf}
                onChange={(e) => setDeviceForm({ ...deviceForm, customerCpf: formatCpf(e.target.value) })}
                className="rounded-xl h-12 bg-muted/30 focus:bg-background font-bold font-mono"
                maxLength={14}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="device-brand" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Marca</Label>
                <Input
                  id="device-brand"
                  placeholder="Ex: Apple"
                  value={deviceForm.brand}
                  onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value.toUpperCase() })}
                  className="rounded-xl h-12 bg-muted/30 focus:bg-background font-bold uppercase"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-model" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Modelo</Label>
                <Input
                  id="device-model"
                  placeholder="Ex: S23 Ultra"
                  value={deviceForm.model}
                  onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value.toUpperCase() })}
                  className="rounded-xl h-12 bg-muted/30 focus:bg-background font-bold uppercase"
                  required
                />
              </div>
            </div>
          </form>

          <div className="p-8 border-t bg-muted/20 flex gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeviceDialogOpen(false)}
              className="flex-1 rounded-2xl h-12 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                void handleCreateDevice(e as any);
              }}
              disabled={createCustomerDevice.isPending}
              className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {createCustomerDevice.isPending ? 'SALVANDO...' : 'SALVAR APARELHO'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
