# Sistema de Estoque e Vasilhames - NaldoGás

## 📦 Como Funciona o Sistema de Estoque

### 1. **Estrutura de Produtos**

Cada produto no sistema possui:
- **Nome**: Identificação do produto (ex: GLP 13Kg, Água 20L)
- **SKU**: Código único do produto (ex: GLP-13, AGUA-20)
- **Preço de Venda**: Valor cobrado do cliente
- **Preço de Custo**: Valor de compra do fornecedor
- **Estoque Mínimo**: Quantidade mínima antes de alertar (ex: 5 unidades)
- **É Vasilhame?**: Flag para indicar se é um vasilhame (cheio/vazio)

### 2. **Tabela de Inventário**

A tabela `inventory` controla a quantidade de cada produto em estoque:

```
Produto: GLP 13Kg
Quantidade em Estoque: 45 unidades
Estoque Mínimo: 5 unidades
Status: OK (acima do mínimo)
```

### 3. **Fluxo de Estoque em uma Venda**

Quando você registra uma venda no PDV:

1. **Adiciona produtos ao carrinho** (ex: 2x GLP 13Kg, 1x Água 20L)
2. **Confirma a venda**
3. **Sistema automaticamente:**
   - Reduz o estoque de GLP 13Kg em 2 unidades (45 → 43)
   - Reduz o estoque de Água 20L em 1 unidade
   - Registra a venda com data/hora/vendedor/canal
   - Verifica se algum produto ficou abaixo do mínimo
   - Se sim, gera alerta para reposição

### 4. **Alertas de Estoque Baixo**

O sistema monitora automaticamente:
- Produtos com estoque abaixo do mínimo configurado
- Exibe aviso no Dashboard
- Pode enviar notificação via WhatsApp

---

## 🛢️ Como Funciona o Sistema de Vasilhames

### 1. **O que são Vasilhames?**

Vasilhames são recipientes retornáveis para armazenar produtos:
- **GLP 13Kg** - Cilindro de gás
- **Água 20L** - Garrafão de água

### 2. **Estados de um Vasilhame**

Cada vasilhame pode estar em 3 estados:

| Estado | Descrição | Localização |
|--------|-----------|------------|
| **CHEIO** | Pronto para venda | Depósito |
| **VAZIO** | Retornou do cliente, aguardando recarga | Depósito |
| **EM POSSE DE CLIENTE** | Cliente tem o vasilhame | Casa do cliente |

### 3. **Fluxo de Vasilhames**

#### **Cenário 1: Venda de Vasilhame Cheio**

```
1. Cliente chega no depósito
2. Você vende 1x GLP 13Kg (CHEIO)
3. Sistema registra:
   - Vasilhame sai do estado CHEIO
   - Passa para EM POSSE DE CLIENTE
   - Associa ao cliente (nome, telefone)
   - Registra data da saída
```

#### **Cenário 2: Cliente Devolve Vasilhame Vazio**

```
1. Cliente volta com o vasilhame vazio
2. Você registra a devolução
3. Sistema atualiza:
   - Vasilhame muda de EM POSSE DE CLIENTE → VAZIO
   - Registra data da devolução
   - Calcula tempo de posse (quantos dias o cliente teve)
```

#### **Cenário 3: Recarga de Vasilhame Vazio**

```
1. Você pega um vasilhame VAZIO
2. Recarrega com gás/água
3. Sistema atualiza:
   - Vasilhame muda de VAZIO → CHEIO
   - Pronto para nova venda
```

### 4. **Rastreamento de Vasilhames em Posse de Clientes**

O módulo **"Vasilhames"** mostra:

```
Cliente: João Silva (Telefone: 27-99999-1234)
├─ GLP 13Kg - Saída: 15/12/2024 (5 dias em posse)
├─ Água 20L - Saída: 10/12/2024 (10 dias em posse)
└─ GLP 13Kg - Saída: 01/12/2024 (19 dias em posse) ⚠️ VENCIDO

Cliente: Maria Santos (Telefone: 27-98888-5678)
├─ Água 20L - Saída: 18/12/2024 (2 dias em posse)
└─ GLP 13Kg - Saída: 18/12/2024 (2 dias em posse)
```

### 5. **Alertas de Vasilhames Vencidos**

O sistema pode alertar quando:
- Um vasilhame está em posse do cliente há mais de **X dias** (configurável)
- Cliente não devolveu o vasilhame
- Necessário cobrar taxa de devolução ou multa

---

## 🔄 Integração Entre Estoque e Vasilhames

### **Exemplo Prático Completo**

```
SEGUNDA-FEIRA (Início do dia)
├─ Estoque: 50x GLP 13Kg (CHEIOS)
├─ Vasilhames em posse de clientes: 30x GLP 13Kg

VENDA 1: Cliente A compra 2x GLP 13Kg
├─ Estoque reduz: 50 → 48
├─ Vasilhames em posse: 30 → 32 (Cliente A agora tem 2)

VENDA 2: Cliente B compra 1x GLP 13Kg
├─ Estoque reduz: 48 → 47
├─ Vasilhames em posse: 32 → 33 (Cliente B agora tem 1)

DEVOLUÇÃO: Cliente A devolve 1x GLP 13Kg vazio
├─ Vasilhames em posse: 33 → 32 (Cliente A agora tem 1)
├─ Vasilhames vazios no depósito: +1
├─ Estoque não muda (ainda é vazio)

RECARGA: Você recarrega 5x vasilhames vazios
├─ Estoque aumenta: 47 → 52 (agora estão CHEIOS)
├─ Vasilhames vazios: -5
```

---

## 📊 Relatórios Disponíveis

### **1. Relatório de Estoque Atual**
- Quantidade de cada produto
- Estoque mínimo vs. Quantidade atual
- Produtos com estoque baixo

### **2. Relatório de Vasilhames**
- Vasilhames CHEIOS no depósito
- Vasilhames VAZIOS no depósito
- Vasilhames EM POSSE DE CLIENTES
- Tempo médio de posse
- Clientes com devoluções vencidas

### **3. Relatório de Movimentação**
- Entrada de vasilhames (recargas)
- Saída de vasilhames (vendas)
- Devoluções de vasilhames

---

## ⚙️ Configurações Recomendadas

### **Estoque Mínimo por Produto**

| Produto | Estoque Mínimo | Justificativa |
|---------|----------------|---------------|
| GLP 13Kg | 10 | Produto mais vendido |
| Água 20L | 8 | Produto popular |
| Acessórios | 5 | Vendas esporádicas |

### **Prazos de Devolução de Vasilhames**

| Vasilhame | Prazo Máximo | Ação |
|-----------|------------|------|
| GLP 13Kg | 30 dias | Alerta após 25 dias |
| Água 20L | 15 dias | Alerta após 12 dias |

---

## 🚨 Alertas Automáticos do Sistema

O sistema envia notificações via WhatsApp quando:

1. **Estoque Baixo**: Produto abaixo do mínimo configurado
2. **Vasilhame Vencido**: Cliente com vasilhame há mais de X dias
3. **Reposição Necessária**: Muitos vasilhames vazios aguardando recarga
4. **Venda Registrada**: Confirmação de venda com canal (Portaria/TeleGás/WhatsApp)

---

## 💡 Dicas de Uso

### **Para o PDV (Venda Rápida)**
- Selecione o canal de venda (Portaria, TeleGás, WhatsApp)
- Busque o cliente por CPF ou telefone (se cadastrado)
- Adicione produtos ao carrinho
- Confirme a venda → Estoque e vasilhames são atualizados automaticamente

### **Para Gerenciamento de Vasilhames**
- Acesse o módulo "Vasilhames" diariamente
- Verifique clientes com devoluções vencidas
- Registre devoluções assim que o cliente retorna
- Acompanhe a recarga de vasilhames vazios

### **Para Relatórios**
- Use o Dashboard para visão rápida
- Acesse "Relatórios" para análises detalhadas
- Exporte dados para análise em Excel

---

## ❓ Perguntas Frequentes

**P: O sistema baixa estoque automaticamente quando vendo um vasilhame?**
R: Sim! Quando você confirma uma venda no PDV, o sistema automaticamente:
   - Reduz o estoque do produto
   - Registra o vasilhame como EM POSSE DE CLIENTE
   - Associa ao cliente

**P: Como faço para registrar a devolução de um vasilhame?**
R: Acesse o módulo "Vasilhames", localize o cliente e o vasilhame, e clique em "Registrar Devolução". O sistema automaticamente muda o status para VAZIO.

**P: Posso vender um vasilhame que está VAZIO?**
R: Não! O sistema só permite vender vasilhames no estado CHEIO. Se tentar vender um vazio, o sistema alertará.

**P: O que acontece se um cliente não devolver o vasilhame?**
R: O sistema gera alertas automáticos após X dias. Você pode:
   - Ligar para o cliente
   - Cobrar taxa de devolução
   - Registrar como perdido

---

## 📞 Suporte

Se tiver dúvidas sobre como usar o sistema de estoque ou vasilhames, entre em contato com o suporte técnico.
