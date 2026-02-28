---
name: Automação Anti-Ban WPP
overview: Implementar estratégias anti-banimento nos sistemas WPPConnect e TurboZap, incluindo simulação de digitação, delays humanizados, warm-up de chip, spintax para variação de mensagens e suporte preparado para proxy.
todos:
  - id: typing
    content: "FASE 1: Implementar simulacao de 'digitando...' no WPPConnect server.js (rotas send-message, send-image, send-file)"
    status: pending
  - id: spintax
    content: "FASE 2: Criar engine spintax.py no TurboZap e integrar com sender.py + UI de preview"
    status: pending
  - id: smart-delay
    content: "FASE 3: Implementar Smart Delay com pausas curtas, longas e horario comercial no sender.py"
    status: pending
  - id: warmup
    content: "FASE 4: Criar sistema de warm-up de chip com limites graduais (warmup.py + tabela chip_status)"
    status: pending
  - id: proxy-prep
    content: "FASE 5: Preparar suporte a proxy no WPPConnect (browserArgs + env var, sem ativar)"
    status: pending
  - id: fingerprint
    content: "FASE 6: Adicionar fingerprint spoofing basico ao Puppeteer no WPPConnect"
    status: pending
  - id: integration
    content: "FASE 7: Integrar TurboZap com WPPConnect passando typing=true nas chamadas HTTP"
    status: pending
isProject: false
---

# Automacao Anti-Ban para WPPConnect + TurboZap

## Contexto Atual

- **WPPConnect** (`AvelarSys/WPPConnect/`): Servidor Node.js com 3 instancias + Redis + Nginx. Envia mensagens direto, sem delay, sem typing, sem proxy.
- **TurboZap** (`AvelarSys/TurboZap/`): Painel Python/FastAPI com campanhas, filas SQLite e delay basico (5-15s). Sem warm-up, sem spintax, sem typing.

## Arquitetura das Mudancas

```mermaid
flowchart TB
    subgraph TurboZap_Python [TurboZap - Python/FastAPI]
        Spintax[Spintax Engine]
        WarmUp[Warm-up Manager]
        SmartDelay[Smart Delay com pausas]
        Queue[Fila SQLite melhorada]
    end

    subgraph WPPConnect_Node [WPPConnect - Node.js]
        Typing[Simulacao Digitando]
        ProxySupport[Suporte a Proxy]
        BrowserFP[Browser Fingerprint]
        SendAPI[API de Envio]
    end

    TurboZap_Python -->|"HTTP com typing=true"| WPPConnect_Node
    WPPConnect_Node -->|"WhatsApp Web"| WhatsApp[WhatsApp Servers]
```



---

## FASE 1: Simulacao de "Digitando..." no WPPConnect

Arquivo: [server.js](AvelarSys/WPPConnect/server.js)

Modificar a rota `POST /api/send-message` para:

1. Receber parametro opcional `typing` (boolean) e `typingDuration` (ms)
2. Antes de enviar, chamar `whatsappClient.startTyping(phone)`
3. Aguardar `typingDuration` (calculado pelo tamanho da mensagem: ~50ms por caractere, min 2s, max 8s)
4. Chamar `whatsappClient.stopTyping(phone)`
5. Enviar a mensagem

Trecho a ser adicionado antes do `sendText`:

```javascript
if (typing !== false) {
    const duration = Math.min(Math.max(message.length * 50, 2000), 8000);
    await whatsappClient.startTyping(formattedPhone);
    await new Promise(r => setTimeout(r, duration));
    await whatsappClient.stopTyping(formattedPhone);
}
```

Mesma logica para `POST /api/send-image` e `POST /api/send-file`.

---

## FASE 2: Spintax Engine no TurboZap

Novo arquivo: `AvelarSys/TurboZap/app/spintax.py`

Implementar funcao que processa templates com chaves:

- Input: `{Oi|Ola|E ai}, {tudo bem|como vai}? Aqui e da {empresa}`
- Output: `Ola, como vai? Aqui e da empresa` (aleatorio a cada chamada)
- Suporte a aninhamento: `{Oi {amigo|parceiro}|Ola}`
- Suporte a variavel de contato: `{nome}`, `{telefone}`

Integrar no arquivo [sender.py](AvelarSys/TurboZap/app/sender.py) na funcao `send_message`, processando o texto antes do envio.

Atualizar o template [new_campaign.html](AvelarSys/TurboZap/templates/new_campaign.html) para incluir instrucoes de uso do spintax e um botao "Preview" que mostra 3 variacoes da mensagem.

---

## FASE 3: Smart Delay com "Pausas para Cafe"

Arquivo: [sender.py](AvelarSys/TurboZap/app/sender.py) - funcao `_send_loop`

Substituir o delay simples por logica humanizada:

1. **Delay entre mensagens:** `random.uniform(15, 45)` segundos (em vez de 5-15)
2. **Pausa curta:** A cada 8-12 mensagens, pausa de 2-5 minutos
3. **Pausa longa ("cafe"):** A cada 30-50 mensagens, pausa de 10-20 minutos
4. **Horario comercial:** Enviar apenas entre 8h e 20h (configuravel)
5. **Variacao do delay baseada no tamanho da mensagem:** Mensagens maiores = delay maior

Adicionar em [config.yaml](AvelarSys/TurboZap/config.yaml):

```yaml
smart_delay:
  message_delay_min: 15
  message_delay_max: 45
  short_break_every: [8, 12]       # a cada 8-12 msgs
  short_break_duration: [120, 300]  # 2-5 min
  long_break_every: [30, 50]        # a cada 30-50 msgs
  long_break_duration: [600, 1200]  # 10-20 min
  business_hours_start: 8
  business_hours_end: 20
```

---

## FASE 4: Sistema de Warm-up de Chip

Novo arquivo: `AvelarSys/TurboZap/app/warmup.py`

Criar gerenciador de aquecimento que:

1. Acompanha a "idade" do chip (dias desde primeira conexao)
2. Calcula o limite diario baseado na maturidade:
  - Dia 1-3: max 5 mensagens/dia
  - Dia 4-7: max 15 mensagens/dia
  - Dia 8-14: max 30 mensagens/dia
  - Dia 15+: limite configurado pelo usuario (padrao 40/dia)
3. Bloqueia envios que excedam o limite diario
4. Armazena dados no SQLite (nova tabela `chip_status`)

Adicionar na tabela do banco ([database.py](AvelarSys/TurboZap/app/database.py)):

```sql
CREATE TABLE IF NOT EXISTS chip_status (
    id INTEGER PRIMARY KEY,
    instance_name TEXT UNIQUE,
    first_connected_at TIMESTAMP,
    daily_limit INTEGER DEFAULT 5,
    messages_sent_today INTEGER DEFAULT 0,
    last_reset_date TEXT,
    is_warm BOOLEAN DEFAULT 0
);
```

Integrar com o sender para checar limite antes de cada envio.

---

## FASE 5: Suporte a Proxy (Preparacao)

Arquivo: [server.js](AvelarSys/WPPConnect/server.js)

Adicionar suporte a proxy nas `browserArgs` do Puppeteer:

```javascript
const proxyUrl = process.env.WPP_PROXY_URL; // ex: http://user:pass@proxy:port
if (proxyUrl) {
    browserArgs.push(`--proxy-server=${proxyUrl}`);
}
```

Adicionar em [env.example](AvelarSys/WPPConnect/env.example):

```
WPP_PROXY_URL=          # Opcional: http://user:pass@host:port
```

Nao ativar agora, apenas preparar o suporte para uso futuro.

---

## FASE 6: Browser Fingerprint Basico

Arquivo: [server.js](AvelarSys/WPPConnect/server.js)

Adicionar args ao Puppeteer para parecer um navegador real:

```javascript
'--disable-blink-features=AutomationControlled',
'--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
```

E no `page.evaluateOnNewDocument` (via WPPConnect config), sobrescrever `navigator.webdriver` para `false`.

---

## FASE 7: Integracao TurboZap com Typing

Arquivo: [sender.py](AvelarSys/TurboZap/app/sender.py) e [wpp_manager.py](AvelarSys/TurboZap/app/wpp_manager.py)

Alterar a chamada HTTP para o WPPConnect incluindo o parametro `typing: true`:

```python
payload = {
    "phone": phone,
    "message": processed_message,  # com spintax aplicado
    "typing": True
}
```

---

## Resumo do Fluxo Final de Envio

```mermaid
sequenceDiagram
    participant User as Usuario
    participant TZ as TurboZap
    participant DB as SQLite
    participant WPP as WPPConnect
    participant WA as WhatsApp

    User->>TZ: Cria campanha com spintax
    TZ->>DB: Salva mensagens pendentes
    TZ->>TZ: Verifica warm-up do chip
    TZ->>TZ: Verifica horario comercial
    
    loop Para cada mensagem
        TZ->>TZ: Aplica spintax na mensagem
        TZ->>TZ: Smart delay aleatorio
        TZ->>WPP: POST /send-message com typing=true
        WPP->>WA: startTyping
        WPP->>WPP: Aguarda 2-8s baseado no tamanho
        WPP->>WA: stopTyping
        WPP->>WA: sendText
        WPP-->>TZ: Resultado
        TZ->>DB: Atualiza status
        TZ->>TZ: Verifica pausas curta/longa
    end
```



## Arquivos que serao criados

- `AvelarSys/TurboZap/app/spintax.py` (novo)
- `AvelarSys/TurboZap/app/warmup.py` (novo)

## Arquivos que serao modificados

- `AvelarSys/WPPConnect/server.js` (typing + proxy + fingerprint)
- `AvelarSys/WPPConnect/env.example` (proxy var)
- `AvelarSys/TurboZap/app/sender.py` (smart delay + spintax + warm-up)
- `AvelarSys/TurboZap/app/wpp_manager.py` (typing param)
- `AvelarSys/TurboZap/app/database.py` (tabela chip_status)
- `AvelarSys/TurboZap/config.yaml` (smart_delay config)
- `AvelarSys/TurboZap/templates/new_campaign.html` (spintax UI)

