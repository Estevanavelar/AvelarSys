import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Package as PackageIcon, Search as SearchIcon, Plus, Minus, Loader2 } from "lucide-react";
import { searchCatalog, type CatalogProduct } from "@/lib/stocktech";

export interface SelectedPart {
  productId: number;
  code: string;
  name: string;
  price: number;
  quantity: number;
  sellerId: string;
  sellerName: string;
  availableStock: number;
}

interface StockTechPartsSelectorProps {
  deviceModel: string;
  selectedParts: SelectedPart[];
  onPartsChange: (parts: SelectedPart[]) => void;
}

function formatMoneyBR(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** Extrai query de busca do modelo do dispositivo (ex: "SAMSUNG GALAXY A03" -> "GALAXY A03") */
function extractSearchQuery(deviceModel: string): string {
  const trimmed = deviceModel.trim();
  if (!trimmed) return "";
  const parts = trimmed.toUpperCase().split(/\s+/);
  if (parts.length <= 1) return trimmed;
  return parts.slice(1).join(" ");
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "Novo",
  USED: "Usado",
  REFURBISHED: "Recondicionado",
  ORIGINAL_RETIRADA: "Original retirada",
};

const WARRANTY_LABELS: Record<string, string> = {
  NONE: "",
  DAYS_7: "7 dias",
  DAYS_30: "30 dias",
  DAYS_90: "90 dias",
  MONTHS_6: "6 meses",
};

export default function StockTechPartsSelector({
  deviceModel,
  selectedParts,
  onPartsChange,
}: StockTechPartsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modelFromDevice = useMemo(() => extractSearchQuery(deviceModel), [deviceModel]);
  const userInput = searchQuery.trim();

  const fetchCatalog = useCallback(async () => {
    if (!userInput && !modelFromDevice) {
      setCatalog([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = userInput
        ? { query: userInput, model: modelFromDevice || undefined }
        : { model: modelFromDevice };
      const results = await searchCatalog(params);
      setCatalog(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar catálogo");
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [userInput, modelFromDevice]);

  useEffect(() => {
    const delay = modelFromDevice && !userInput ? 100 : 500;
    const t = setTimeout(fetchCatalog, delay);
    return () => clearTimeout(t);
  }, [fetchCatalog, modelFromDevice, userInput]);

  const togglePart = (p: CatalogProduct, checked: boolean) => {
    const price = parseFloat(String(p.price)) || 0;
    const existing = selectedParts.find((s) => s.productId === p.id);
    if (checked) {
      if (existing) {
        onPartsChange(
          selectedParts.map((s) =>
            s.productId === p.id ? { ...s, quantity: Math.min(s.quantity + 1, p.quantity) } : s
          )
        );
      } else {
        onPartsChange([
          ...selectedParts,
          {
            productId: p.id,
            code: p.code,
            name: p.name,
            price,
            quantity: 1,
            sellerId: p.sellerUserId ?? "",
            sellerName: p.sellerStoreName ?? "",
            availableStock: p.quantity,
          },
        ]);
      }
    } else {
      onPartsChange(selectedParts.filter((s) => s.productId !== p.id));
    }
  };

  const setQuantity = (productId: number, delta: number) => {
    onPartsChange(
      selectedParts
        .map((s) => {
          if (s.productId !== productId) return s;
          const next = s.quantity + delta;
          if (next <= 0) return null;
          if (next > s.availableStock) return s;
          return { ...s, quantity: next };
        })
        .filter((s): s is SelectedPart => s !== null)
    );
  };

  const totalSum = useMemo(
    () => selectedParts.reduce((s, p) => s + p.price * p.quantity, 0),
    [selectedParts]
  );

  const hasModel = deviceModel.trim().length > 0;

  if (!hasModel) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-6 text-center">
        <PackageIcon className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Preencha o modelo do equipamento acima para buscar peças no catálogo StockTech.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Buscar peças
        </Label>
        <div className="relative">
          <Input
            type="search"
            placeholder={`Ex: ${extractSearchQuery(deviceModel) || "GALAXY A03"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            autoComplete="off"
            className="rounded-xl h-12 pl-11 font-medium bg-background border-border/50"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (userInput || modelFromDevice) && catalog.length === 0 && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma peça encontrada.</p>
        </div>
      )}

      {!loading && !error && catalog.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
            {catalog.map((p) => {
              const price = parseFloat(String(p.price)) || 0;
              const sel = selectedParts.find((s) => s.productId === p.id);
              const isChecked = !!sel;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(c) => togglePart(p, !!c)}
                    className="border-gray-400 bg-gray-500/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-bold text-orange-600">
                        R$ {formatMoneyBR(price)}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        Estoque: {p.quantity}
                      </Badge>
                      {p.condition && (
                        <Badge variant="outline" className="text-[10px] border-muted-foreground/40">
                          {CONDITION_LABELS[p.condition] ?? p.condition}
                        </Badge>
                      )}
                      {p.warrantyPeriod && p.warrantyPeriod !== "NONE" && (
                        <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600">
                          Garantia: {WARRANTY_LABELS[p.warrantyPeriod] ?? p.warrantyPeriod}
                        </Badge>
                      )}
                      {p.sellerStoreName && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {p.sellerStoreName}
                        </span>
                      )}
                    </div>
                  </div>
                  {isChecked && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(p.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">{sel.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(p.id, 1)}
                        disabled={sel.quantity >= sel.availableStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedParts.length > 0 && (
            <div className="border-t border-border/50 px-4 py-3 bg-muted/20 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedParts.length} peça(s) selecionada(s)
              </span>
              <span className="font-bold text-orange-600">
                Total: R$ {formatMoneyBR(totalSum)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
