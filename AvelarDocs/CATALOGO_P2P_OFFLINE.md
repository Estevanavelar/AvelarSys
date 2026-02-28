# Catalogo P2P com Dados Locais (Offline-First)

**Status:** Proposta  
**Objetivo:** Marketplace onde o catalogo do vendedor existe no dispositivo dele e
so aparece para compradores quando o vendedor esta online.  
**Premissa de negocio:** vendedor offline = nao vende.

---

## Visao Geral

Este modelo usa:
- **Servidor central** apenas para autenticacao, presenca online e transacoes.
- **Banco local no dispositivo** do vendedor (IndexedDB/SQLite) para catalogo.
- **Consulta P2P**: compradores leem dados diretamente do dispositivo do vendedor.
- **Modo offline**: vendedor opera localmente e so expõe catalogo quando online.

---

## Principios do Modelo

1. **Disponibilidade condicionada**  
   Se o vendedor estiver offline, os produtos dele nao aparecem.

2. **Dados do catalogo no dispositivo**  
   O registro completo do produto fica local (nome, foto, preco, estoque).

3. **Transacao central**  
   Pagamento, pedido e confirmacao sempre passam pelo servidor central.

4. **Presenca online obrigatoria**  
   O servidor apenas lista vendedores online e oferece um indice resumido.

5. **Flexibilidade hibrida (opcional)**  
   Alguns usuarios podem usar banco centralizado enquanto outros usam offline-first.

---

## Componentes

### 1) Dispositivo do Vendedor (Web App)
- Banco local: IndexedDB (web) ou SQLite (PWA/TWA).
- Armazena: produtos, fotos, estoque, configuracoes.
- Publica dados quando online (via WebSocket/WebRTC).

### 2) Servidor Central
- Autenticacao e autorizacao.
- Presenca online (quem esta disponivel).
- Indice resumido de produtos (cache rapido).
- Transacoes, pagamentos e reconciliacao.

### 3) Comprador (Web App)
- Busca no indice central (apenas vendedores online).
- Busca detalhes no dispositivo do vendedor.
- Fecha pedido no servidor central.

---

## Fluxos Principais

### A) Cadastro de Produto (Vendedor)
1. Vendedor cadastra produto no web app.
2. Produto salvo no banco local.
3. Se online, publica dados resumidos no servidor.

### B) Catalogo Online (Comprador)
1. Comprador consulta indice central.
2. Recebe lista de vendedores online + produtos resumidos.
3. Ao abrir item, app busca detalhes no dispositivo do vendedor.

### C) Compra
1. Comprador inicia compra.
2. Servidor central confirma preco e estoque do vendedor.
3. Servidor cria transacao e processa pagamento.
4. Servidor atualiza estoque local do vendedor (push).

---

## Indice Resumido (Servidor)

Para evitar busca lenta em varios dispositivos, o servidor guarda **apenas**
campos basicos enquanto o vendedor esta online:
- product_id_local
- nome
- preco
- categoria
- estoque
- miniatura
- vendedor_id
- timestamp

---

## Presenca Online

O servidor central deve manter:
- **status online** por usuario
- **ultimo heartbeat** (ex: a cada 10s)
- **tempo maximo offline** (ex: 30s sem heartbeat = offline)

Isso evita produtos "fantasmas" no catalogo.

---

## Sincronizacao e Eventos

Mesmo com dados locais, usar **eventos** ajuda a manter consistencia:
- create_product
- update_product
- delete_product
- update_stock

Quando o vendedor fica online:
1. Envia eventos pendentes ao servidor.
2. Servidor atualiza indice resumido.

---

## Confiabilidade e Fraude

Riscos reais:
- vendedor muda preco no meio da compra
- estoque divergente
- dados incompletos

Mitigacao:
- servidor central **valida preco e estoque** no momento do pagamento
- compras so confirmadas com **ack do vendedor**
- logs de eventos para auditoria

---

## Offline por Minutos

Funciona com PWA:
- cache de telas e assets
- banco local com dados do vendedor
- fila de eventos para enviar quando online

Limite realista: alguns minutos ate reconectar e atualizar indice.

---

## Tecnologias Recomendadas

**Web:**
- IndexedDB (Dexie, idb)
- Service Worker (cache + offline)
- WebSocket para presenca
- WebRTC opcional (P2P direto)

**Servidor:**
- Redis para presenca
- API de indice resumido
- API de transacoes

---

## Roadmap de Implementacao (Fases)

1. **Fase 1 - Base**
   - Banco local no vendedor
   - Presenca online via WebSocket
   - Catalogo resumido central

2. **Fase 2 - P2P Detalhes**
   - Buscar detalhes do produto direto do vendedor
   - Timeout + fallback

3. **Fase 3 - Compra Segura**
   - Validacao de estoque e preco no servidor
   - Confirmacao do vendedor

4. **Fase 4 - Offline Melhorado**
   - Fila de eventos
   - Reenvio automatico

---

## Regras de Negocio (fixas)

- Vendedor offline = produto invisivel
- Transacao sempre central
- Preco final confirmado no checkout

---

## Modo Hibrido: Offline-First + Centralizado

Possibilidade de misturar modelos para transicao gradual ou ofertar opcoes:

### Configuracoes por Usuario

No JWT ou perfil do usuario, adicionar flag `storageMode`:

```json
{
  "userId": "123",
  "storageMode": "offline" | "centralized",
  "accountId": "acc-456"
}
```

### Casos de Uso

**Caso 1: Vendedores Premium (centralizado)**
- Sempre online (mais confiavel)
- Sem risco de downtime
- Catalogo permanente

**Caso 2: Vendedores Normais (offline-first)**
- Menor custo de infraestrutura
- Flexivel, trabalham offline
- Catálogo condicional

**Caso 3: Transicao Gradual**
- Lançar com offline-first
- Oferecer "upgrade" para centralizado
- Medir qual modelo convém

### Implementacao

No frontend, na inicializacao:

```javascript
if (user.storageMode === "offline") {
  // Inicializa IndexedDB local
  await initLocalDB();
  initWebSocketPresence();
} else {
  // Inicializa cliente API centralizado
  await initCentralizedDB();
}
```

### Indice Unificado no Servidor

O servidor mantem um **indice unico** que mescla:
- dados de usuarios offline-first (quando online)
- dados de usuarios centralizado (sempre)

Busca retorna ambos transparentemente.

### Vantagens

✅ Flexibilidade total  
✅ Teste A/B entre modelos  
✅ Reducao gradual de risco  
✅ Opcoes para usuarios  

### Restricoes

- Busca fica ligeiramente mais complexa
- Servidor precisa orquestrar ambos os modos
- UI/UX pode diferenciar entre modos

---

## Checklist para MVP

**Fase 1 (Offline-First Base):**
- [ ] Banco local funcionando
- [ ] Presenca online confiavel
- [ ] Catalogo resumido central
- [ ] Busca e listagem de vendedores online
- [ ] Checkout central

**Fase 2 (Hibrido Opcional):**
- [ ] Suporte a modo centralizado
- [ ] Flag storageMode no usuario
- [ ] Indice unificado no servidor
- [ ] Inicializacao adaptativa no frontend
- [ ] Testes A/B entre modelos

