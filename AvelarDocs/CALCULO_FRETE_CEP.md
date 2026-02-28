# 📍 Cálculo de Frete por Distância entre CEPs

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Status:** 🔄 Em Desenvolvimento  
**Biblioteca:** cep-promise

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Critérios de Frete](#critérios-de-frete)
3. [Instalação](#instalação)
4. [Implementação](#implementação)
5. [Exemplos de Cálculo](#exemplos-de-cálculo)
6. [Integração no Checkout](#integração-no-checkout)
7. [Frontend](#frontend)

---

## Visão Geral

Sistema de cálculo automático de frete baseado em **distância entre CEPs** do vendedor e do comprador usando a biblioteca `cep-promise` com fórmula de Haversine para cálculo de distância geodésica.

### Funcionalidades:
- ✅ Busca coordenadas (latitude/longitude) de CEPs
- ✅ Calcula distância em km entre dois pontos
- ✅ Aplica tabela de preços dinâmica
- ✅ Calcula automaticamente no checkout
- ✅ UI desabilitada (futuro)

---

## Critérios de Frete

### Tabela de Preços por Distância

| Distância | Taxa |
|-----------|------|
| **Até 3 km** (100m - 3km) | R$ 3,00 (taxa fixa) |
| **Acima de 3 km** | R$ 3,00 + R$ 1,50 por km excedente |

### Exemplos:
```
1 km  → R$ 3,00
3 km  → R$ 3,00
5 km  → R$ 3,00 + (2 × R$ 1,50) = R$ 6,00
10 km → R$ 3,00 + (7 × R$ 1,50) = R$ 13,50
20 km → R$ 3,00 + (17 × R$ 1,50) = R$ 28,50
```

---

## Instalação

### 1. Instalar biblioteca cep-promise

```bash
cd /home/avelarsys/AvelarSys/StockTech/server
npm install cep-promise
```

### 2. Verificar instalação

```bash
npm list cep-promise
```

---

## Implementação

### Backend - StockTech/server/routers/orders.ts

#### 1. Importar biblioteca e tipos

```typescript
import { cep } from 'cep-promise';

interface CEPData {
  latitude?: string;
  longitude?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
}
```

#### 2. Função para calcular distância entre CEPs

```typescript
/**
 * Calcular distância entre dois CEPs em km
 * Usa fórmula de Haversine para distância geodésica
 * 
 * @param cepVendedor CEP do vendedor (ex: "28010100")
 * @param cepComprador CEP do comprador (ex: "28015130")
 * @returns Distância em km (arredondada a 1 decimal)
 */
async function calcularDistanciaEntreDesk(
  cepVendedor: string, 
  cepComprador: string
): Promise<number> {
  try {
    // Limpar CEPs (remover caracteres não numéricos)
    const vendedorClean = cepVendedor.replace(/\D/g, '');
    const compradorClean = cepComprador.replace(/\D/g, '');

    // Validar tamanho
    if (vendedorClean.length !== 8 || compradorClean.length !== 8) {
      throw new Error('CEP inválido');
    }

    // Buscar dados dos CEPs
    const vendedorData = await cep(vendedorClean) as CEPData;
    const compradorData = await cep(compradorClean) as CEPData;

    // Extrair coordenadas
    const lat1 = parseFloat(vendedorData.latitude || '0');
    const lon1 = parseFloat(vendedorData.longitude || '0');
    const lat2 = parseFloat(compradorData.latitude || '0');
    const lon2 = parseFloat(compradorData.longitude || '0');

    // Validar coordenadas
    if (lat1 === 0 || lon1 === 0 || lat2 === 0 || lon2 === 0) {
      console.warn('Coordenadas inválidas para cálculo de distância');
      return 0; // Retorna 0, será taxa mínima
    }

    // Fórmula de Haversine
    // Calcula a distância entre dois pontos na superfície da Terra
    const R = 6371; // Raio da Terra em km

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    // Arredondar para 1 decimal
    return Math.round(distancia * 10) / 10;
  } catch (error) {
    console.error('❌ Erro ao calcular distância entre CEPs:', {
      cepVendedor,
      cepComprador,
      erro: error instanceof Error ? error.message : String(error)
    });
    // Fallback: retorna 0 (distância zero = taxa mínima)
    return 0;
  }
}

/**
 * Calcular valor do frete baseado em distância
 * 
 * Tabela de preços:
 * - Até 3 km: R$ 3,00 (taxa fixa)
 * - Acima de 3 km: R$ 3,00 + (km excedente × R$ 1,50)
 * 
 * @param distanciaKm Distância em quilômetros
 * @returns Valor do frete em reais
 */
function calcularFrete(distanciaKm: number): number {
  if (distanciaKm <= 3) {
    // Taxa fixa para até 3 km
    return 3.00;
  } else {
    // Acima de 3 km: taxa base + valor por km excedente
    const kmExcedente = distanciaKm - 3;
    const freteCalculado = 3.00 + (kmExcedente * 1.50);
    
    // Arredondar para 2 casas decimais
    return Math.round(freteCalculado * 100) / 100;
  }
}
```

#### 3. Integrar no roteador de criação de pedidos

**Encontrar:** Linha 89-90 em `orders.ts`

**Antes:**
```typescript
// Calcular frete (simplificado - implementar cálculo real depois)
const freight = 15.00; // Valor fixo por enquanto
```

**Depois:**
```typescript
// Buscar perfil do vendedor para obter CEP
const { sellerProfiles } = await import("../../drizzle/schema");
const vendedorProfile = await database
  .select()
  .from(sellerProfiles)
  .where(eq(sellerProfiles.userId, sellerId))
  .limit(1);

const cepVendedor = vendedorProfile[0]?.zipCode || "28000000"; // Vitória-ES como padrão
const cepComprador = userAddress[0].zipCode;

// Calcular distância entre CEPs
const distancia = await calcularDistanciaEntreDesk(cepVendedor, cepComprador);

// Calcular frete baseado na distância
const freight = calcularFrete(distancia);

// Log para debug
console.log(`📍 Frete Calculado:
  Vendedor CEP: ${cepVendedor}
  Comprador CEP: ${cepComprador}
  Distância: ${distancia} km
  Frete: R$ ${freight.toFixed(2)}`);
```

---

## Exemplos de Cálculo

### Exemplo 1: Mesma Cidade (1 km)
```
Vendedor: Vitória-ES (28015130)
Comprador: Vitória-ES (28010100)
Distância: 1 km
Frete: R$ 3,00 ✓
```

### Exemplo 2: Cidades Vizinhas (15 km)
```
Vendedor: Vitória-ES (28015130)
Comprador: Vila Velha-ES (28330270)
Distância: 15 km
Cálculo: R$ 3,00 + (12 km × R$ 1,50) = R$ 3,00 + R$ 18,00
Frete: R$ 21,00 ✓
```

### Exemplo 3: Longa Distância (50 km)
```
Vendedor: Vitória-ES (28015130)
Comprador: Colatina-ES (29700000)
Distância: 50 km
Cálculo: R$ 3,00 + (47 km × R$ 1,50) = R$ 3,00 + R$ 70,50
Frete: R$ 73,50 ✓
```

### Exemplo 4: Distância Exata (3 km)
```
Vendedor: Ponto A (28015130)
Comprador: Ponto B (28010100)
Distância: 3 km
Frete: R$ 3,00 ✓ (no limite da taxa fixa)
```

---

## Integração no Checkout

### Fluxo de Cálculo Automático

```
1. Usuário seleciona produto → vai para checkout
   ↓
2. Usuário seleciona endereço de entrega
   ↓
3. Clica "Confirmar Compra"
   ↓
4. Backend busca:
   - CEP do comprador (do endereço selecionado)
   - CEP do vendedor (do perfil do vendedor)
   ↓
5. Calcula distância entre CEPs
   ↓
6. Aplica tabela de frete
   ↓
7. Pedido criado com frete calculado
   ↓
8. Exibe valor total no CheckoutSuccess.tsx
```

---

## Frontend

### Checkout.tsx - Seção de Frete (Desabilitada)

```tsx
{/* Seção de Frete - Em Desenvolvimento */}
<Card>
  <CardHeader>
    <CardTitle>Frete</CardTitle>
  </CardHeader>
  <CardContent>
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>Recurso em desenvolvimento:</strong> O frete será calculado automaticamente com base na distância entre os CEPs do vendedor e do comprador.
        <br />
        <span className="text-xs text-gray-600 mt-2 block">
          ✓ Até 3 km: R$ 3,00 | ✓ Acima de 3 km: R$ 1,50 por km excedente
        </span>
      </AlertDescription>
    </Alert>
  </CardContent>
</Card>
```

### Mostrar Frete Calculado (CheckoutSuccess.tsx)

O valor já está sendo exibido corretamente em:

```tsx
<p className="text-xl font-bold text-green-600">
  R$ {totalValue.toFixed(2)}
</p>
```

Que agora inclui:
- Subtotal dos produtos
- Frete calculado automaticamente

---

## Troubleshooting

### Erro: "CEP não encontrado"

**Causa:** CEP inválido ou não cadastrado no ViaCEP

**Solução:**
- Validar CEP antes de enviar
- Fallback para taxa mínima (R$ 3,00)
- Usar CEP padrão se não conseguir calcular

```typescript
if (!vendedorData || !compradorData) {
  console.warn('CEP não encontrado, usando taxa mínima');
  return 3.00; // Taxa mínima
}
```

### Erro: "Coordenadas inválidas"

**Causa:** ViaCEP retornou coordenadas zeradas

**Solução:** Retorna distância 0, que aplica taxa mínima

```typescript
if (lat1 === 0 || lon1 === 0) {
  console.warn('Coordenadas inválidas');
  return 0; // Taxa mínima
}
```

### Performance: Cálculo lento

**Solução:** Cache de distâncias

```typescript
// Adicionar cache em memória (opcional)
const distanceCache = new Map<string, number>();

async function calcularDistanciaComCache(
  cepVendedor: string,
  cepComprador: string
): Promise<number> {
  const key = `${cepVendedor}-${cepComprador}`;
  
  if (distanceCache.has(key)) {
    return distanceCache.get(key)!;
  }
  
  const distancia = await calcularDistanciaEntreDesk(cepVendedor, cepComprador);
  distanceCache.set(key, distancia);
  
  return distancia;
}
```

---

## Referências

### Documentação
- [cep-promise GitHub](https://github.com/brasilapi/cep-promise)
- [Fórmula de Haversine](https://en.wikipedia.org/wiki/Haversine_formula)
- [ViaCEP API](https://viacep.com.br/)

### Testes
```bash
# Testar CEPs reais em Espírito Santo
Vitória: 28015130
Vila Velha: 28330270
Cariacica: 29145600
Serra: 29165400
```

---

## Próximas Melhorias

- [ ] Cache de distâncias em banco de dados
- [ ] Integração com tabela de transportadoras
- [ ] Calculadora de frete na UI para o vendedor visualizar
- [ ] Histórico de fretes por pedido
- [ ] Admin: Editar tabela de preços dinamicamente
- [ ] Notificação em tempo real do frete calculado

---

**Desenvolvido para:** AvelarSys - StockTech  
**Versão:** 1.0  
**Status:** 🔄 Pronto para Implementação
