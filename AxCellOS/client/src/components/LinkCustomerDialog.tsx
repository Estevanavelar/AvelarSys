import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomers } from '@/contexts/CustomersContext';
import { 
  User as UserIcon, 
  Search as SearchIcon, 
  Check as CheckIcon, 
  Plus as PlusIcon, 
  Info as InfoIcon,
  Link as LinkIcon,
  X as XIcon
} from 'lucide-react';

interface LinkCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customerName: string, customerCPF: string) => void;
}

export function LinkCustomerDialog({
  open,
  onOpenChange,
  onConfirm,
}: LinkCustomerDialogProps) {
  const { searchByCPF } = useCustomers();
  const [cpf, setCPF] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCPF(formatted);
    setFoundCustomer(null);
  };

  const handleSearchCustomer = () => {
    if (!cpf) return;

    setIsSearching(true);
    const cleanCPF = cpf.replace(/\D/g, '');
    const found = searchByCPF(cleanCPF);

    if (found) {
      setFoundCustomer(found);
      setCustomerName(found.name);
    } else {
      setFoundCustomer(null);
      setCustomerName('');
    }
    setIsSearching(false);
  };

  const handleConfirm = () => {
    if (!cpf && !customerName) {
      alert('Preencha pelo menos o CPF ou nome do cliente');
      return;
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF && !foundCustomer) {
      alert('CPF não encontrado. Para vincular CPF, pesquise um cliente existente ou clique em "Pular".');
      return;
    }

    onConfirm(foundCustomer?.name || customerName, foundCustomer ? cleanCPF : '');
    handleClose();
  };

  const handleClose = () => {
    setCPF('');
    setCustomerName('');
    setFoundCustomer(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[97vw] max-w-[97vw] max-h-[97vh] p-0 overflow-hidden border-none rounded-[32px] bg-background shadow-2xl flex flex-col">
        {/* Header Personalizado */}
        <div className="bg-primary/5 px-8 pt-8 pb-6 border-b border-primary/10 relative shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-primary/20 p-3 rounded-2xl text-primary">
              <LinkIcon className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                Vincular Cliente
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Identifique o cliente para finalizar a venda
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Busca por CPF */}
          <div className="space-y-3">
            <Label htmlFor="cpf" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Buscar por CPF
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCPFChange}
                  maxLength={14}
                  className="rounded-xl h-14 pl-12 font-bold bg-muted/30 focus:bg-background transition-all"
                />
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
              <Button
                onClick={handleSearchCustomer}
                variant="secondary"
                disabled={!cpf || isSearching}
                className="rounded-xl h-14 px-6 border border-border/50 hover:bg-primary/10 hover:text-primary transition-all font-bold"
              >
                {isSearching ? '...' : <SearchIcon className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Resultado da Busca */}
          {foundCustomer ? (
            <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-[24px] flex items-center gap-4 animate-in fade-in zoom-in-95">
              <div className="bg-green-500/20 p-3 rounded-2xl text-green-600">
                <CheckIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Cliente Encontrado</p>
                <p className="text-lg font-black text-foreground">{foundCustomer.name}</p>
                <p className="text-sm text-muted-foreground font-medium">{foundCustomer.phone || 'Sem telefone cadastrado'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <Label htmlFor="customerName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Nome do Cliente (Novo Registro)
              </Label>
              <div className="relative">
                <Input
                  id="customerName"
                  placeholder="Digite o nome completo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-xl h-14 pl-12 font-bold bg-muted/30 focus:bg-background transition-all"
                />
                <PlusIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Dica */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-3">
            <InfoIcon className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs text-primary/80 font-medium">
              Vincular o cliente permite gerar o cupom fiscal identificado e manter o histórico de compras.
            </p>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-8 border-t bg-muted/20 flex gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onConfirm('', '');
              handleClose();
            }}
            className="flex-1 rounded-2xl h-14 font-bold text-base transition-all active:scale-95 border-border/50 hover:bg-background"
          >
            Pular
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-[2] gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-14 font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            <CheckIcon className="w-5 h-5" />
            VINCULAR CLIENTE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
