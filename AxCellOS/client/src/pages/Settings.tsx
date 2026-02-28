import React, { useState, useEffect } from 'react';
import { 
  Bell, Lock, Palette, LogOut, ChevronRight, Percent, 
  CreditCard, CreditCard as DebitIcon, Calculator, Trash2, Plus,
  Building2, Phone, MapPin, Globe, FileText, AlertCircle,
  Save, Check, FileCheck, Pencil, Loader2
} from 'lucide-react';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatCpf, formatCnpj, formatPhone, formatPhoneBR, normalizePhoneBR, formatCep } from '@/lib/utils';

export interface FeeSettings {
  debit: number;
  credit1x: number;
  installments: { [key: number]: number };
}

export interface CompanyProfile {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website?: string;
}

const DEFAULT_FEES: FeeSettings = {
  debit: 1.99,
  credit1x: 3.49,
  installments: {
    2: 4.99,
    3: 5.99,
    4: 6.99,
    5: 7.99,
    6: 8.99,
    7: 9.99,
    8: 10.99,
    9: 11.99,
    10: 12.99,
    11: 13.99,
    12: 14.99,
  }
};

const DEFAULT_COMPANY: CompanyProfile = {
  name: 'AxCellOS',
  cnpj: '00.000.000/0000-00',
  phone: '(00) 00000-0000',
  address: 'Rua Principal, 123',
  city: 'Cidade',
  state: 'UF',
  zipCode: '00000-000',
};

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState('perfil');
  
  const { data: feesSetting } = trpc.settings.getSetting.useQuery({ key: 'fees' });
  const { data: companySetting } = trpc.settings.getSetting.useQuery({ key: 'company' });
  const { data: accountProfile } = trpc.settings.getAccountProfile.useQuery();
  const { data: notificationsSetting } = trpc.settings.getSetting.useQuery({ key: 'notifications' });
  const { data: warrantyTermsData } = trpc.settings.getWarrantyTerms.useQuery();
  
  const setFeesMutation = trpc.settings.setFees.useMutation({
    onSuccess: async (saved) => {
      // Mantém cache e fallback local sincronizados para uso imediato no app inteiro.
      try {
        localStorage.setItem('axcellos_fees', JSON.stringify((saved as any)?.value ?? saved));
      } catch {
        // ignora falha de storage
      }
      await utils.settings.getSetting.invalidate({ key: 'fees' });
      toast.success('Taxas salvas com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar taxas'),
  });
  
  const setCompanyMutation = trpc.settings.setCompany.useMutation({
    onSuccess: () => {
      toast.success('Dados da empresa salvos!');
      window.dispatchEvent(new CustomEvent('axcellos_company_updated'));
    },
    onError: () => toast.error('Erro ao salvar dados da empresa'),
  });
  
  const setNotificationsMutation = trpc.settings.setNotifications.useMutation({
    onSuccess: () => toast.success('Preferências de notificação salvas!'),
    onError: () => toast.error('Erro ao salvar preferências'),
  });

  const createWarrantyTermMutation = trpc.settings.createWarrantyTerm.useMutation({
    onSuccess: () => {
      utils.settings.getWarrantyTerms.invalidate();
      toast.success('Termo cadastrado!');
    },
    onError: () => toast.error('Erro ao cadastrar termo'),
  });

  const updateWarrantyTermMutation = trpc.settings.updateWarrantyTerm.useMutation({
    onSuccess: () => {
      utils.settings.getWarrantyTerms.invalidate();
      toast.success('Termo atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar termo'),
  });

  const deleteWarrantyTermMutation = trpc.settings.deleteWarrantyTerm.useMutation({
    onSuccess: () => {
      utils.settings.getWarrantyTerms.invalidate();
      toast.success('Termo removido!');
    },
    onError: () => toast.error('Erro ao remover termo'),
  });

  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [notifications, setNotifications] = useState({
    newOrder: true,
    orderStatus: true,
    dailyReport: false,
  });
  const [warrantyTerms, setWarrantyTerms] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [editingTermIndex, setEditingTermIndex] = useState<number | null>(null);
  const [editingTermTitle, setEditingTermTitle] = useState('');
  const [editingTermContent, setEditingTermContent] = useState('');
  const [newTermTitle, setNewTermTitle] = useState('');
  const [newTermContent, setNewTermContent] = useState('');
  const [isAddTermDialogOpen, setIsAddTermDialogOpen] = useState(false);

  useEffect(() => {
    if (feesSetting?.value) {
      setFees(feesSetting.value as FeeSettings);
    }
  }, [feesSetting]);

  useEffect(() => {
    const fromNeon = accountProfile ? {
      name: accountProfile.name || DEFAULT_COMPANY.name,
      cnpj: accountProfile.cnpj || DEFAULT_COMPANY.cnpj,
      phone: accountProfile.phone || DEFAULT_COMPANY.phone,
      address: accountProfile.address || DEFAULT_COMPANY.address,
      city: accountProfile.city || DEFAULT_COMPANY.city,
      state: accountProfile.state || DEFAULT_COMPANY.state,
      zipCode: accountProfile.zipCode || DEFAULT_COMPANY.zipCode,
    } : {};
    const fromSettings = (companySetting?.value as CompanyProfile | undefined) || {};
    setCompany({
      ...DEFAULT_COMPANY,
      ...fromNeon,
      ...fromSettings,
    });
  }, [accountProfile, companySetting]);

  useEffect(() => {
    if (notificationsSetting?.value) {
      setNotifications(notificationsSetting.value as typeof notifications);
    }
  }, [notificationsSetting]);

  useEffect(() => {
    if (!warrantyTermsData) return;
    setWarrantyTerms(
      warrantyTermsData.map((term) => ({
        id: term.id,
        title: term.title,
        content: term.content,
      }))
    );
  }, [warrantyTermsData]);

  const saveFees = (newFees: FeeSettings) => {
    setFees(newFees);
    setFeesMutation.mutate(newFees);
  };

  const saveCompany = (newCompany: CompanyProfile) => {
    setCompany(newCompany);
    setCompanyMutation.mutate(newCompany);
  };

  const saveNotifications = (newNotifications: typeof notifications) => {
    setNotifications(newNotifications);
    setNotificationsMutation.mutate(newNotifications);
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  };

  const updateInstallmentFee = (months: number, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    const newInstallments = { ...fees.installments, [months]: numValue };
    saveFees({ ...fees, installments: newInstallments });
  };

  const handleCepBlur = async () => {
    const digits = company.zipCode.replace(/\D/g, '');
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro && data.logradouro) {
          const updated = {
            ...company,
            address: data.logradouro + (data.complemento ? `, ${data.complemento}` : ''),
            city: data.localidade || company.city,
            state: data.uf || company.state,
          };
          setCompany(updated);
          saveCompany(updated);
          return;
        }
      } catch {
        // ignora erro de rede
      }
    }
    saveCompany(company);
  };

  const addWarrantyTerm = async () => {
    const title = newTermTitle.trim();
    const content = newTermContent.trim();
    if (!title || !content) return false;
    if (warrantyTerms.some((term) => term.title.toLowerCase() === title.toLowerCase())) {
      toast.info('Já existe um termo com esse título.');
      return false;
    }
    await createWarrantyTermMutation.mutateAsync({ title, content });
    setNewTermTitle('');
    setNewTermContent('');
    return true;
  };

  const startEditTerm = (index: number) => {
    setEditingTermIndex(index);
    setEditingTermTitle(warrantyTerms[index]?.title ?? '');
    setEditingTermContent(warrantyTerms[index]?.content ?? '');
  };

  const saveEditTerm = async () => {
    if (editingTermIndex === null) return;
    const term = warrantyTerms[editingTermIndex];
    if (!term) return;
    const title = editingTermTitle.trim();
    const content = editingTermContent.trim();
    if (!title || !content) return;
    await updateWarrantyTermMutation.mutateAsync({
      id: term.id,
      title,
      content,
    });
    setEditingTermIndex(null);
    setEditingTermTitle('');
    setEditingTermContent('');
  };

  const cancelEditTerm = () => {
    setEditingTermIndex(null);
    setEditingTermTitle('');
    setEditingTermContent('');
  };

  const removeWarrantyTerm = async (index: number) => {
    const term = warrantyTerms[index];
    if (!term) return;
    await deleteWarrantyTermMutation.mutateAsync({ id: term.id });
    cancelEditTerm();
  };

  return (
    <ResponsiveLayout activeTab="configuracoes">
      <div className="space-y-8 max-w-4xl mx-auto pb-20">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-2 text-lg">Gerencie sua conta e taxas do sistema</p>
        </div>

        <Tabs defaultValue="perfil" className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50 inline-flex min-w-full sm:min-w-0">
              <TabsTrigger value="perfil" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all whitespace-nowrap">
                Perfil
              </TabsTrigger>
              <TabsTrigger value="empresa" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all whitespace-nowrap">
                Empresa
              </TabsTrigger>
              <TabsTrigger value="taxas" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all whitespace-nowrap">
                Taxas Maquininha
              </TabsTrigger>
              <TabsTrigger value="notificacoes" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all whitespace-nowrap">
                Notificacoes
              </TabsTrigger>
              <TabsTrigger value="termos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all whitespace-nowrap">
                Termos
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-sm transition-all whitespace-nowrap">
                Seguranca
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="perfil" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">Dados do Usuário</h2>
                  <p className="text-muted-foreground text-sm">Informações da sua conta</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nome</Label>
                  <Input 
                    value={user?.name || ''} 
                    disabled 
                    className="h-12 rounded-xl font-bold bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">CPF</Label>
                  <Input 
                    value={formatCpf(user?.cpf || user?.email || '')} 
                    disabled 
                    className="h-12 rounded-xl font-bold bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                  <Input 
                    value={formatPhone(user?.whatsapp || '')} 
                    disabled 
                    className="h-12 rounded-xl font-bold bg-muted/30"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="empresa" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">Perfil da Empresa</h2>
                  <p className="text-muted-foreground text-sm">Dados que aparecerão em orçamentos e comprovantes</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Empresa</Label>
                  <div className="relative">
                    <Input 
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      onBlur={() => saveCompany(company)}
                      className="h-12 rounded-xl pl-10 font-bold bg-muted/30 focus:bg-background transition-all"
                      placeholder="Ex: AxCellOS Assistência"
                    />
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">CNPJ</Label>
                  <div className="relative">
                    <Input 
                      value={formatCnpj(company.cnpj)}
                      onChange={(e) => setCompany({ ...company, cnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                      onBlur={() => saveCompany(company)}
                      className="h-12 rounded-xl pl-10 font-bold bg-muted/30 focus:bg-background transition-all"
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Input 
                      value={formatPhoneBR(company.phone)}
                      onChange={(e) => setCompany({ ...company, phone: normalizePhoneBR(e.target.value) })}
                      onBlur={() => saveCompany(company)}
                      className="h-12 rounded-xl pl-10 font-bold bg-muted/30 focus:bg-background transition-all"
                      placeholder="(55) 27 99999-7310"
                      maxLength={18}
                    />
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Endereço Completo</Label>
                  <div className="relative">
                    <Input 
                      value={company.address}
                      onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      onBlur={() => saveCompany(company)}
                      className="h-12 rounded-xl pl-10 font-bold bg-muted/30 focus:bg-background transition-all"
                      placeholder="Rua, Número, Bairro"
                    />
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Cidade</Label>
                  <Input 
                    value={company.city}
                    onChange={(e) => setCompany({ ...company, city: e.target.value })}
                    onBlur={() => saveCompany(company)}
                    className="h-12 rounded-xl font-bold bg-muted/30 focus:bg-background transition-all"
                    placeholder="Sua Cidade"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">UF</Label>
                    <Input 
                      value={company.state}
                      onChange={(e) => setCompany({ ...company, state: e.target.value.toUpperCase() })}
                      onBlur={() => saveCompany(company)}
                      maxLength={2}
                      className="h-12 rounded-xl font-bold bg-muted/30 focus:bg-background transition-all text-center"
                      placeholder="UF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">CEP</Label>
                    <Input 
                      value={formatCep(company.zipCode)}
                      onChange={(e) => setCompany({ ...company, zipCode: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                      onBlur={handleCepBlur}
                      className="h-12 rounded-xl font-bold bg-muted/30 focus:bg-background transition-all text-center"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Certifique-se de que os dados estão corretos. Eles serão impressos automaticamente em todos os comprovantes de venda e ordens de serviço.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="taxas" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">Configuração de Taxas</h2>
                  <p className="text-muted-foreground text-sm">Defina os descontos automáticos da sua maquininha</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                  <Percent className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <DebitIcon className="w-3 h-3" /> Taxa de Débito (%)
                  </Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.01"
                      value={fees.debit}
                      onChange={(e) => setFees({ ...fees, debit: parseFloat(e.target.value) || 0 })}
                      onBlur={(e) => {
                        const debit = parseFloat(e.currentTarget.value) || 0;
                        saveFees({ ...fees, debit });
                      }}
                      className="h-14 rounded-2xl pl-12 text-lg font-bold bg-muted/30 focus:bg-background transition-all"
                    />
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Crédito 1x (%)
                  </Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.01"
                      value={fees.credit1x}
                      onChange={(e) => setFees({ ...fees, credit1x: parseFloat(e.target.value) || 0 })}
                      onBlur={(e) => {
                        const credit1x = parseFloat(e.currentTarget.value) || 0;
                        saveFees({ ...fees, credit1x });
                      }}
                      className="h-14 rounded-2xl pl-12 text-lg font-bold bg-muted/30 focus:bg-background transition-all"
                    />
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <Separator className="my-8 opacity-50" />

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Taxas de Parcelamento (Crédito)
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.entries(fees.installments).map(([months, value]) => (
                    <div key={months} className="bg-muted/20 border border-border/50 p-4 rounded-2xl space-y-2 hover:border-primary/30 transition-colors group">
                      <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{months}x Vezes</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={value}
                          onChange={(e) => updateInstallmentFee(parseInt(months), e.target.value)}
                          className="h-10 rounded-xl pr-8 font-bold text-sm bg-background border-none shadow-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="bg-primary/5 text-primary p-4 rounded-2xl text-xs font-medium border border-primary/10">
                  Dica: Essas taxas serão usadas para calcular o valor líquido que você recebe em cada venda no PDV ou Ordem de Serviço.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-black mb-6 text-foreground flex items-center gap-2">
                <Bell className="w-6 h-6 text-primary" />
                Alertas do Sistema
              </h2>
              <div className="grid gap-4">
                {[
                  { id: 'newOrder', label: 'Nova Ordem', desc: 'Notificar quando uma nova ordem for criada' },
                  { id: 'orderStatus', label: 'Alteração de Status', desc: 'Notificar quando o status de uma ordem mudar' },
                  { id: 'dailyReport', label: 'Relatório Diário', desc: 'Receber um resumo diário das atividades' },
                ].map((item) => (
                  <label key={item.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl hover:bg-muted/50 transition-all border border-border/50 cursor-pointer group">
                    <div className="space-y-1">
                      <p className="font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.id as keyof typeof notifications]}
                        onChange={(e) => saveNotifications({ ...notifications, [item.id]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="termos" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">Termos de Garantia</h2>
                  <p className="text-muted-foreground text-sm">Cadastre termos que aparecerão na criação de ordens de serviço</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <FileCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsAddTermDialogOpen(true)}
                    disabled={createWarrantyTermMutation.isPending}
                    className="h-12 rounded-xl px-6 font-bold gap-2 shrink-0"
                  >
                    {createWarrantyTermMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-2">
                  {warrantyTerms.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-8 text-center border border-dashed border-border rounded-2xl">
                      Nenhum termo cadastrado. Adicione acima para usar na criação de OS.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {warrantyTerms.map((term, index) => (
                        <li key={term.id} className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/50 group">
                          {editingTermIndex === index ? (
                            <div className="flex-1 space-y-2">
                              <Input
                                value={editingTermTitle}
                                onChange={(e) => setEditingTermTitle(e.target.value)}
                                placeholder="Título do termo"
                                className="h-10 rounded-lg"
                              />
                              <RichTextEditor
                                value={editingTermContent}
                                onChange={setEditingTermContent}
                                placeholder="Texto do termo (pode ser longo, com formatação e imagens)"
                                minHeight="min-h-[200px]"
                              />
                              <div className="flex justify-end">
                                <Button size="sm" variant="secondary" onClick={() => void saveEditTerm()} className="shrink-0 rounded-lg">
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-foreground">{term.title}</p>
                                <div
                                  className="text-xs text-muted-foreground mt-1 prose prose-sm dark:prose-invert max-w-none [&_img]:max-h-24 [&_img]:rounded"
                                  dangerouslySetInnerHTML={{ __html: term.content || '' }}
                                />
                                <p className="text-[10px] text-muted-foreground mt-2 font-mono">ID: {term.id}</p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => startEditTerm(index)} className="shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => void removeWarrantyTerm(index)} className="shrink-0 rounded-lg text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seguranca" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-black mb-6 text-foreground flex items-center gap-2">
                <Lock className="w-6 h-6 text-primary" />
                Proteção da Conta
              </h2>
              <div className="space-y-4 max-w-md">
                <Button variant="outline" className="w-full justify-between h-16 rounded-2xl border-dashed hover:bg-primary/5 hover:border-primary transition-all group">
                  <span className="font-bold">Alterar Senha de Acesso</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-16 rounded-2xl border-dashed hover:bg-primary/5 hover:border-primary transition-all group">
                  <span className="font-bold">Autenticação em Dois Fatores (2FA)</span>
                  <div className="bg-muted px-3 py-1 rounded-lg text-[10px] font-black uppercase text-muted-foreground">Desativado</div>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-6 pt-10 border-t border-border">
          <Button
            onClick={handleLogout}
            className="w-full sm:w-auto gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-2xl h-14 px-10 font-black shadow-sm transition-all active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            ENCERRAR SESSAO
          </Button>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
            <p className="text-xs font-bold uppercase tracking-widest">
              Versao 1.0.0 - AxCellOS 2026
            </p>
            <p className="text-[10px] font-medium italic">
              Ambiente de Desenvolvimento Avelar Company
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={isAddTermDialogOpen}
        onOpenChange={(open) => {
          setIsAddTermDialogOpen(open);
          if (!open) {
            setNewTermTitle('');
            setNewTermContent('');
          }
        }}
      >
        <DialogContent className="!flex !flex-col w-[97vw] max-w-[97vw] h-[97vh] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl gap-0">
          <div className="bg-primary/5 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-primary/10 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                Novo termo de garantia
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                Esse termo ficará disponível na criação de ordens de serviço. Use a barra de ferramentas para formatação e imagens.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="new-warranty-term-title">Título</Label>
              <Input
                id="new-warranty-term-title"
                value={newTermTitle}
                onChange={(e) => setNewTermTitle(e.target.value)}
                placeholder="Ex: Garantia padrão de tela"
                className="h-12 rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-warranty-term-content">Texto do termo</Label>
              <RichTextEditor
                value={newTermContent}
                onChange={setNewTermContent}
                placeholder="Digite aqui o texto completo do termo. Use negrito, itálico, listas, links e insira imagens pela barra de ferramentas."
                minHeight="min-h-[40vh]"
                className="flex-1"
              />
            </div>
          </div>
          <div className="shrink-0 flex justify-end gap-2 p-4 sm:p-6 border-t border-border bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddTermDialogOpen(false);
                setNewTermTitle('');
                setNewTermContent('');
              }}
              className="rounded-xl h-12 px-6 font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() =>
                void addWarrantyTerm().then((created) => {
                  if (created) setIsAddTermDialogOpen(false);
                })
              }
              disabled={!newTermTitle.trim() || !newTermContent.trim() || createWarrantyTermMutation.isPending}
              className="rounded-xl gap-2 h-12 px-6 font-bold"
            >
              {createWarrantyTermMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Salvar termo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}
