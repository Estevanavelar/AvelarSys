# 🚀 Super iframe - Guia Completo de Implementação

**Versão:** 1.0  
**Data:** 2026-01-25  
**Status:** Pronto para Implementação  
**Objetivo:** Integrar módulos (StockTech, AvAdmin) dentro do App Portal usando iframe adaptativo com otimizações críticas de performance

---

## 📑 Sumário Executivo

Este documento descreve a implementação de um sistema de "Super iframe" que permite abrir módulos completos dentro do App Portal, com experiência responsiva:
- **Mobile:** Fullscreen com botão de voltar
- **Desktop:** Split-screen com visualização lado-a-lado
- **Ambos:** Totalmente isolado, sem impacto na independência dos módulos

**Performance esperada após otimizações:**
- Mobile 4G: 6-8s → 2-3s ✅
- Desktop: 2-3s → 1s ✅
- Scroll FPS: 30fps → 60fps ✅

---

## 📋 Índice

1. [Arquitetura Geral](#arquitetura-geral)
2. [9 Problemas Críticos e Soluções](#9-problemas-críticos-e-soluções)
3. [Plano de Implementação em Fases](#plano-de-implementação-em-fases)
4. [Fase 1: Fundações](#fase-1-fundações)
5. [Fase 2: Otimizações Críticas](#fase-2-otimizações-críticas)
6. [Fase 3: Polish & Performance](#fase-3-polish--performance)
7. [Checklist de Deploy](#checklist-de-deploy)

---

## 🏗️ Arquitetura Geral

### Estrutura de Roteamento

```
app.avelarcompany.com.br/
│
├── / (Dashboard normal)
│   └── Componentes: Dashboard, Settings, Profile
│
├── /:module (Super iframe)
│   ├── Mobile (<1024px): Fullscreen Mode
│   │   ├── iframe fullscreen
│   │   └── Botão Voltar (bottom)
│   │
│   └── Desktop (≥1024px): Split-Screen Mode
│       ├── Left (33%): Portal Dashboard
│       ├── Right (67%): iPhone Preview (375px)
│       │   └── iframe StockTech/AvAdmin
│       └── Botão Voltar (ambos os lados)
│
└── /stocktech (redirect para /:module/stocktech)
└── /avadmin (redirect para /:module/avadmin)
```

### Fluxo de Dados

```
Portal (App)
├── Estado: activeModule, isMobile, authToken
├── Renderiza condicional
│   ├── isMobile=true → EmbeddedModuleMobile
│   └── isMobile=false → EmbeddedModuleDesktop
│
└── iframe (Sandbox)
    ├── Origin: https://stocktech.avelarcompany.com.br
    ├── Comunicação: PostMessage API
    └── Isolamento: Sem acesso direto ao Portal
```

---

## ⚠️ 9 Problemas Críticos e Soluções

### Problema #1: Duplicação de Bundle

**O que causa:**
```
Portal carrega:  app.js (500KB) + app.css (100KB) = 600KB
iframe carrega:  stocktech.js (500KB) + stocktech.css (150KB) = 650KB
────────────────────────────────────────────────────────────────
TOTAL TRANSFERIDO: 1.25MB (vs 600KB se fosse só Portal)

Time impact (4G):
- Sem iframe: 3 segundos
- Com iframe: 6 segundos
- Diferença: +100% (3 segundos extras)
```

**Por que acontece:**
- React, ReactDOM, Tailwind, Axios, etc carregam 2x
- Ambas as apps bundlam suas próprias dependências
- Sem compartilhamento de bibliotecas

**Solução:**
```typescript
// Step 1: Expor libs globais no Portal
// AppPortal/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';

window.__AVELAR_SHARED__ = {
  React,
  ReactDOM,
  axios,
  // Outras libs pesadas...
};

// Step 2: Importar do Portal no iframe
// StockTech (dentro do iframe context)
const React = window.__AVELAR_SHARED__?.React || require('react');
const axios = window.__AVELAR_SHARED__?.axios || require('axios');

// Step 3: Ajustar webpack/vite
// stocktech.vite.config.js
export default {
  external: ['react', 'react-dom', 'axios'],
  // Resultado: StockTech reduz de 500KB para 200KB
};
```

**Impacto:**
- ✅ Bundle StockTech: 500KB → 200KB (-60%)
- ✅ Total transferido: 1.25MB → 800KB (-36%)
- ✅ Load time: 6s → 4s (-33%)

**Verificação:**
```bash
# Checar bundle size
npm run build && du -sh dist/

# Antes: StockTech = 500KB
# Depois: StockTech = 200KB
```

---

### Problema #2: iframe Overhead de Contexto

**O que causa:**
```
Cada iframe cria:
├── Novo contexto JavaScript (overhead de parsing)
├── Nova árvore DOM (duplicação de memoria)
├── Compilação de código separada
└── Latência PostMessage (~30ms por mensagem)

CPU spike ao abrir iframe:
- Portal JS parsing: 100ms
- iframe JS parsing: 150ms
- DOM construction: 200ms
- ────────────────────────
- TOTAL: 450ms de "congelamento"
```

**Por que acontece:**
- V8 precisa compilar JS duas vezes
- DOM layout recalcula para Portal + iframe
- Event listeners disparam em paralelo

**Solução:**
```typescript
// Use requestIdleCallback para evitar jank
// AppPortal/src/hooks/useOptimizedIframe.ts
export function useOptimizedIframe(moduleUrl: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (iframeRef.current) {
          iframeRef.current.src = moduleUrl;
          setLoaded(true);
        }
      }, { timeout: 2000 });
    } else {
      // Fallback para navegadores antigos
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = moduleUrl;
          setLoaded(true);
        }
      }, 500);
    }
  }, [moduleUrl]);

  return { iframeRef, loaded };
}

// Uso:
const { iframeRef, loaded } = useOptimizedIframe(moduleUrl);
return (
  <>
    <iframe ref={iframeRef} />
    {!loaded && <LoadingSpinner />}
  </>
);
```

**Impacto:**
- ✅ Congelamento visível: 450ms → 0ms
- ✅ Main thread livre para UI responsiva
- ✅ Usuário não percebe lag

**Verificação:**
```javascript
// No DevTools, medir:
console.time('iframe-load');
// ... abrir iframe
console.timeEnd('iframe-load');
// Esperado: <100ms (vs 450ms antes)
```

---

### Problema #3: Memory Leak (CRÍTICO)

**O que causa:**
```
Desktop Split-Screen com múltiplos cliques:

1º clique em StockTech:
   - Portal DOM: 50MB
   - iframe StockTech: 80MB
   ────────────────────
   Total: 130MB

2º clique em AvAdmin (sem limpar StockTech):
   - Portal DOM: 50MB
   - iframe StockTech: 80MB (NÃO REMOVIDO!)
   - iframe AvAdmin: 85MB (novo)
   ────────────────────
   Total: 215MB (vazamento 85MB)

Após 5 cliques:
   - Total: 500MB+
   - App fica lento, depois TRAVA

Após 10 cliques:
   - Total: 900MB
   - Browser pode dar OutOfMemory
   - App FECHA
```

**Por que acontece:**
- iframe antigos não são removidos da memória
- Listeners de eventos não são desinscritos
- DOM da página anterior persiste

**Solução:**
```typescript
// AppPortal/src/pages/EmbeddedModuleDesktop.tsx
import { useEffect, useRef } from 'react';

export function EmbeddedModuleDesktop({ moduleUrl }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Cleanup: Crucial para evitar memory leak
    return () => {
      if (iframeRef.current) {
        // 1. Limpar src
        iframeRef.current.src = 'about:blank';
        
        // 2. Remover listeners
        iframeRef.current.contentWindow?.close?.();
        
        // 3. Dereferência
        iframeRef.current = null;
      }

      // 4. Forçar garbage collection (se disponível)
      if (performance.memory) {
        console.log('Memory before GC:', performance.memory.usedJSHeapSize);
        // GC é automático, mas podemos sugerir
      }
    };
  }, []);

  return <iframe ref={iframeRef} src={moduleUrl} />;
}

// Verificação de memory leak
export function useMemoryMonitoring() {
  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        const percent = (used / limit) * 100;
        
        console.log(`Memory: ${Math.round(used / 1048576)}MB / ${Math.round(limit / 1048576)}MB (${percent.toFixed(1)}%)`);
        
        if (percent > 80) {
          console.warn('⚠️ Memory usage high!');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);
}
```

**Impacto:**
- ✅ Múltiplos cliques: 500MB → 150MB (mantém estável)
- ✅ Sem crash por OutOfMemory
- ✅ App estável por horas

**Verificação:**
```javascript
// DevTools → Memory → Take Heap Snapshot
// Antes: 130MB → 215MB → 300MB (crescendo)
// Depois: 130MB → 130MB → 130MB (estável)
```

---

### Problema #4: localStorage Compartilhado (Segurança)

**O que causa:**
```
Portal e iframe (mesmo origin):
├── Compartilham MESMO localStorage
│   ├── Portal escreve: localStorage.setItem('token', 'xyz')
│   └── iframe acessa: localStorage.getItem('token') = 'xyz'
│
└── Risco de segurança:
    ├── Se houver XSS no StockTech
    │   └── Acesso direto ao token do Portal
    ├── Colisão de chaves
    │   └── Um sobrescreve o outro
    └── Sem isolamento de dados
```

**Por que acontece:**
- iframe sandbox=allow-same-origin permite acesso
- localStorage é vinculado ao domínio, não ao iframe
- Sem namespace/prefixo, conflito é garantido

**Solução:**
```typescript
// AppPortal/src/utils/storageManager.ts
class IsolatedStorage {
  private prefix: string;

  constructor(moduleName: string) {
    this.prefix = `avelar_${moduleName}_`;
  }

  setItem(key: string, value: string) {
    localStorage.setItem(this.prefix + key, value);
  }

  getItem(key: string) {
    return localStorage.getItem(this.prefix + key);
  }

  removeItem(key: string) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Portal usa:
const portalStorage = new IsolatedStorage('portal');
portalStorage.setItem('token', 'portal_token_xyz');

// StockTech usa (via PostMessage):
const stocktechStorage = new IsolatedStorage('stocktech');
stocktechStorage.setItem('token', 'stocktech_token_abc');

// localStorage final:
// avelar_portal_token = "portal_token_xyz"
// avelar_stocktech_token = "stocktech_token_abc"
// ✅ Sem conflito!
```

**Para dados sensíveis (token JWT):**
```typescript
// AppPortal/src/utils/secureAuth.ts
export async function sendTokenToIframe(
  iframe: HTMLIFrameElement,
  token: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Token send timeout')),
      5000
    );

    const handler = (event: MessageEvent) => {
      // Validar origem
      if (event.origin !== 'https://stocktech.avelarcompany.com.br') {
        reject(new Error('Invalid origin'));
        return;
      }

      if (event.data.type === 'TOKEN_RECEIVED') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve();
      }
    };

    window.addEventListener('message', handler);

    // Enviar token com timeout
    iframe.contentWindow?.postMessage(
      {
        type: 'AUTH_TOKEN',
        token: token,
        timestamp: Date.now(),
        expiresIn: 5000 // 5 segundos
      },
      'https://stocktech.avelarcompany.com.br'
    );
  });
}

// StockTech recebe:
window.addEventListener('message', (event) => {
  // 1. Validar origem
  if (event.origin !== 'https://app.avelarcompany.com.br') {
    console.warn('Invalid origin:', event.origin);
    return;
  }

  // 2. Validar timestamp (anti-replay)
  if (Date.now() - event.data.timestamp > 5000) {
    console.warn('Token expired');
    return;
  }

  // 3. Guardar em sessionStorage (mais seguro que localStorage)
  if (event.data.type === 'AUTH_TOKEN') {
    sessionStorage.setItem('auth_token', event.data.token);
    
    // 4. Confirmar recebimento
    event.source?.postMessage(
      { type: 'TOKEN_RECEIVED' },
      event.origin
    );
  }
});
```

**Impacto:**
- ✅ Token isolado e seguro
- ✅ Sem risco de XSS compartilhado
- ✅ Dados não sobrescrevem

**Verificação:**
```javascript
// DevTools → Application → Local Storage
// Antes: auth_token, user_id, settings (compartilhado)
// Depois: avelar_portal_token, avelar_stocktech_token (isolado)
```

---

### Problema #5: CSS Conflicts

**O que causa:**
```
Portal: Tailwind v3 + custom CSS
StockTech: Tailwind v4 + Material UI
AvAdmin: Bootstrap 5 + custom CSS

Mesmo com sandbox, conflitos acontecem:
├── Global resets (*, *::before)
├── !important declarations
├── CSS variables (@apply, --color-primary)
├── Font faces (3 carregamentos)
└── Vendor prefixes

Resultado visual:
- Botões distorcidos no iframe
- Espaçamento estranho
- Cores incorretas
- Fontes duplicadas (150KB extra)
```

**Por que acontece:**
- CSS é global, iframe não isola completamente
- Specificity wars
- Media queries conflitam

**Solução:**
```typescript
// Opção 1: BEM Naming Convention (Recomendado para StockTech)
// stocktech/src/styles/base.css
.stocktech__container { }
.stocktech__header { }
.stocktech__button { }
.stocktech__button--primary { }
.stocktech__button--primary:hover { }

// Nunca sobrescreve .button ou .container do Portal

// Opção 2: Shadow DOM (Para isolamento total)
// AppPortal/src/components/EmbeddedModuleDesktop.tsx
export function EmbeddedModuleDesktop({ moduleUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Criar Shadow DOM
    const shadowRoot = containerRef.current.attachShadow({ 
      mode: 'open' 
    });

    // Estilo isolado (não afeta Portal)
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      /* Reset local só aqui */
      * { margin: 0; padding: 0; }
    `;
    shadowRoot.appendChild(style);

    // iframe dentro do Shadow DOM
    const iframe = document.createElement('iframe');
    iframe.src = moduleUrl;
    shadowRoot.appendChild(iframe);

  }, [moduleUrl]);

  return <div ref={containerRef} />;
}

// Opção 3: CSS Namespacing (Mais simples)
// StockTech: Adicionar prefixo em todos os arquivos
// original: .button { }
// prefixed: .stocktech .button { }

// Remover CSS duplicado via vite/webpack
export default {
  external: ['@tailwindcss/forms'],
  // StockTech não carrega Tailwind, usa do Portal
};
```

**Impacto:**
- ✅ Sem distorção visual no iframe
- ✅ Bundle CSS reduz 150KB (não duplica)
- ✅ Estilo consistente

**Verificação:**
```javascript
// DevTools → Elements → Inspect iframe
// Não deve ter <link rel="stylesheet"> duplicado
// Antes: 3 stylesheets
// Depois: 0 stylesheets (herda do Portal)
```

---

### Problema #6: Network Waterfall

**O que causa:**
```
Timeline de carregamento sequencial:

0ms:   Portal começa
100ms: Portal CSS chega
150ms: Portal JS chega
200ms: Portal renderiza
250ms: iframe começa (só agora!)
350ms: iframe CSS chega
400ms: iframe JS chega
450ms: iframe renderiza
        ↓
   TOTAL: 450ms
   
Vs se fosse paralelo:
   
0ms:   Portal + iframe começam
100ms: Ambos CSS chegam
150ms: Ambos JS chegam
200ms: Ambos renderizam
        ↓
   TOTAL: 200ms (55% mais rápido)
```

**Por que acontece:**
- HTML carrega 1 recurso por vez
- iframe src só começa após DOM pronto
- HTTP/1 limita conexões simultâneas

**Solução:**
```typescript
// AppPortal/src/utils/preloadModules.ts
export function preloadModule(moduleUrl: string) {
  // 1. Preload HTML
  const preloadLink = document.createElement('link');
  preloadLink.rel = 'preload';
  preloadLink.as = 'fetch';
  preloadLink.href = moduleUrl;
  document.head.appendChild(preloadLink);

  // 2. DNS Prefetch
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = new URL(moduleUrl).origin;
  document.head.appendChild(dnsPrefetch);

  // 3. Preconnect
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = new URL(moduleUrl).origin;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
}

// Uso: Quando Portal carrega
useEffect(() => {
  preloadModule('https://stocktech.avelarcompany.com.br');
  preloadModule('https://avadmin.avelarcompany.com.br');
}, []);

// Service Worker para cache offline
// AppPortal/public/sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('stocktech.avelarcompany.com.br') ||
      event.request.url.includes('avadmin.avelarcompany.com.br')) {
    
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((res) => {
          const cache = caches.open('modules-v1');
          cache.then((c) => c.put(event.request, res.clone()));
          return res;
        });
      })
    );
  }
});

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.log('SW registration failed:', err);
  });
}
```

**Com HTTP/2 Server Push (no nginx):**
```nginx
# nginx.conf
server {
  listen 443 http2;
  
  location / {
    # Push recursos críticos
    http2_push /js/stocktech.js;
    http2_push /css/stocktech.css;
    
    proxy_pass http://stocktech-backend;
  }
}
```

**Impacto:**
- ✅ Load paralelo vs sequencial
- ✅ Cache offline (primeiro acesso lento, próximos rápidos)
- ✅ Waterfall de requisições reduzido

**Verificação:**
```javascript
// DevTools → Network → Timeline
// Antes: Barras sequenciais (uma após outra)
// Depois: Barras paralelas (lado a lado)
// Resultado: 450ms → 200ms (55% mais rápido)
```

---

### Problema #7: Scroll Performance (Mobile)

**O que causa:**
```
Mobile fullscreen iframe com 1000 items:

Ao scrollar:
├── Renderizar 50 items visíveis: OK (16ms)
├── Manter renderizados 100 items off-screen: problema
│   └── DOM grande = layout recalc lento
├── Paint todos os items: LENTO
│   └── GPU sobrecarregada
└── Resultado: 30fps lag, battery drain 2x

Sintomas:
- Scroll "travado"
- Scroll "aliado" (não suave)
- Battery 0% em 2 horas
```

**Por que acontece:**
- Renderizar 1000 DOM nodes em mobile é pesado
- GPU limitada em smartphones antigos
- Scroll events disparam recálculos constantemente

**Solução: Virtual Scrolling**
```typescript
// StockTech/src/components/VirtualizedList.tsx
import { FixedSizeList } from 'react-window';

export function ProductList({ products }: Props) {
  const itemSize = 60; // altura de cada item em pixels

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="stocktech__product-item">
      <h3>{products[index].name}</h3>
      <p>${products[index].price}</p>
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={itemSize}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Resultado:
// Antes: 1000 items no DOM = LENTO
// Depois: Apenas 10-15 items visíveis no DOM = RÁPIDO

// Passive event listeners (não bloqueia scroll)
document.addEventListener('scroll', handleScroll, { passive: true });

// CSS para smoothing
body {
  -webkit-overflow-scrolling: touch; /* iOS smooth */
  scroll-behavior: smooth;
}

// Disable transform para performance
.product-item {
  /* ❌ Evitar transform no scroll */
  /* transform: translateY(...); */
  
  /* ✅ Usar will-change com moderação */
  will-change: auto;
}
```

**Impacto:**
- ✅ Scroll FPS: 30fps → 60fps
- ✅ Battery: -50% drain
- ✅ Smooth scrolling certeiro

**Verificação:**
```javascript
// DevTools → Performance → Record
// Antes: Spikes a cada scroll (layout thrashing)
// Depois: Flat line, consistent 60fps
```

---

### Problema #8: Resize Events Thrashing

**O que causa:**
```
Desktop Split-Screen ao redimensionar:

1. User redimensiona janela
2. Portal recebe resize event
3. Portal recalcula layout (50 elementos)
4. Portal triggera repaint/reflow
5. iframe também recebe resize
6. iframe recalcula layout (100 elementos)
7. iframe triggera repaint/reflow
8. CSS media queries triggam 2x
9. Back to step 1...

Resultado: 200+ recalcs por segundo
            CPU spike 100%
            Janela congela
```

**Por que acontece:**
- `window.onresize` dispara múltiplas vezes
- Cada evento causa DOM recalc
- Sem debounce/throttle = caos

**Solução: ResizeObserver + Throttle**
```typescript
// AppPortal/src/hooks/useOptimizedResize.ts
import { useEffect, useRef } from 'react';

export function useOptimizedResize(callback: () => void, delay = 300) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // ResizeObserver é melhor que window.resize
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
        callback();
      }, delay);
    });

    observer.observe(document.body);

    return () => {
      clearTimeout(timeoutRef.current);
      observer.disconnect();
    };
  }, [callback, delay]);
}

// Uso:
export function EmbeddedModuleDesktop({ moduleUrl }: Props) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useOptimizedResize(() => {
    setContainerSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, 300);

  return (
    <div style={{ width: containerSize.width, height: containerSize.height }}>
      <iframe src={moduleUrl} />
    </div>
  );
}

// Media queries apenas em debounce:
const handleResponsiveChange = throttle(() => {
  // Recalcular layout apenas uma vez
  document.documentElement.style.setProperty('--columns', 
    window.innerWidth < 768 ? '1' : '2'
  );
}, 300);
```

**Impacto:**
- ✅ Resize smoothness
- ✅ CPU não vai a 100%
- ✅ Sem congelamento

**Verificação:**
```javascript
// DevTools → Performance → Record while resizing
// Antes: Spikes a cada resize (300+ per second)
// Depois: Single recalc por ciclo (~1-2 per debounce)
```

---

### Problema #9: Token Security (PostMessage)

**O que causa:**
```
Sem segurança em PostMessage:

Portal → iframe:
  postMessage({
    type: 'AUTH',
    token: 'eyJhbGc...' // TOKEN EXPOSTO!
  }, '*')  // ❌ '*' = aceita qualquer origem!

Cenários de ataque:
1. Man-in-the-Middle pode interceptar
2. XSS em outro site consegue o token
3. Replay attack: Token antigo reutilizado
4. Sem validação de origem
```

**Por que acontece:**
- Desenvolvimento sem segurança
- Sem validação de origem
- Sem timestamp/expiration
- Sem validação no receptor

**Solução: Secure PostMessage Pattern**
```typescript
// AppPortal/src/utils/securePostMessage.ts

/**
 * Envia token de forma segura com validação
 * @param iframe HTMLIFrameElement
 * @param token JWT token
 * @param targetOrigin Origem esperada do iframe
 */
export async function sendTokenSecurely(
  iframe: HTMLIFrameElement,
  token: string,
  targetOrigin: string
): Promise<void> {
  // Validar iframe existe
  if (!iframe?.contentWindow) {
    throw new Error('Invalid iframe');
  }

  // Validar token
  if (!token || token.length < 10) {
    throw new Error('Invalid token');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Token handshake timeout'));
    }, 5000);

    const messageId = `token_${Date.now()}_${Math.random()}`;

    const handler = (event: MessageEvent) => {
      // 1. Validar origem (CRÍTICO)
      if (event.origin !== targetOrigin) {
        console.warn('Invalid origin:', event.origin);
        return;
      }

      // 2. Validar mensagem de confirmação
      if (
        event.data.type === 'TOKEN_ACK' &&
        event.data.messageId === messageId
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve();
      }
    };

    window.addEventListener('message', handler);

    // Enviar token com metadados de segurança
    iframe.contentWindow.postMessage(
      {
        type: 'AUTH_TOKEN',
        messageId: messageId,
        token: token,
        timestamp: Date.now(),
        expiresIn: 5000, // 5 segundos
        nonce: Math.random().toString(36)
      },
      targetOrigin // ✅ Origem específica, não '*'
    );
  });
}

// StockTech/src/utils/authReceiver.ts
export function setupSecureAuthReceiver() {
  window.addEventListener('message', (event) => {
    // 1. Validar origem com rigor
    const expectedOrigin = 'https://app.avelarcompany.com.br';
    if (event.origin !== expectedOrigin) {
      console.error('Invalid origin:', event.origin);
      return;
    }

    // 2. Validar tipo de mensagem
    if (event.data.type !== 'AUTH_TOKEN') {
      return;
    }

    // 3. Validar timestamp (anti-replay)
    const now = Date.now();
    const messageTime = event.data.timestamp;
    
    if (now - messageTime > event.data.expiresIn) {
      console.error('Token expired');
      return;
    }

    // 4. Validar token format (JWT)
    const tokenParts = event.data.token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid JWT format');
      return;
    }

    try {
      // 5. Verificar assinatura (se possível)
      // const decoded = jwtDecode(event.data.token);
      // if (decoded.exp * 1000 < Date.now()) {
      //   throw new Error('Token expired');
      // }

      // 6. Guardar em sessionStorage (não localStorage)
      sessionStorage.setItem('auth_token', event.data.token);
      sessionStorage.setItem('token_nonce', event.data.nonce);

      // 7. Confirmar recebimento
      if (event.source) {
        event.source.postMessage(
          {
            type: 'TOKEN_ACK',
            messageId: event.data.messageId
          },
          expectedOrigin
        );
      }
    } catch (error) {
      console.error('Auth setup failed:', error);
    }
  });
}

// Inicializar ao carregar
setupSecureAuthReceiver();
```

**Impacto:**
- ✅ Token seguro e validado
- ✅ Sem replay attacks
- ✅ Isolamento de origem garantido
- ✅ Expiração automática

**Verificação:**
```javascript
// DevTools → Application → Session Storage
// Antes: auth_token exposto em localStorage
// Depois: Token em sessionStorage (mais seguro)

// Testar origem inválida:
window.postMessage({
  type: 'AUTH_TOKEN',
  token: 'fake'
}, 'https://malicioso.com');
// ✅ Rejeitado (validação de origem)
```

---

## 📅 Plano de Implementação em Fases

### Overview Geral

```
Fase 1 (Semana 1): Fundações
├── Routing adaptativo
├── Componentes Mobile/Desktop
└── Cleanup de memory leak

Fase 2 (Semana 2): Otimizações Críticas
├── Bundle sharing
├── Security (token)
├── Storage isolation
└── CSS conflicts

Fase 3 (Semana 3): Polish & Performance
├── Virtual scrolling
├── Resize optimization
├── Network waterfall
└── Testing & refinement
```

---

## 🔧 Fase 1: Fundações

### Duração: 3-4 dias
### Objetivo: Setup básico funcional

#### 1.1 Detecção de Responsive

**Arquivo:** `AppPortal/src/hooks/useResponsive.ts`

```typescript
import { useState, useEffect } from 'react';

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setIsMobile(window.innerWidth < 1024);
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, windowSize };
}
```

#### 1.2 Página Mobile Fullscreen

**Arquivo:** `AppPortal/src/pages/EmbeddedModuleMobile.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

interface EmbeddedModuleMobileProps {
  moduleName: string;
  moduleUrl: string;
}

export function EmbeddedModuleMobile({
  moduleName,
  moduleUrl,
}: EmbeddedModuleMobileProps) {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cleanup memory leak
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
        iframeRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-white overflow-hidden">
      {/* iframe Fullscreen */}
      <iframe
        ref={iframeRef}
        src={moduleUrl}
        title={moduleName}
        className="flex-1 w-full h-full border-none"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-storage"
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; microphone; payment; usb; xr-spatial-tracking"
      />

      {/* Botão Voltar (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-lg">
        <button
          onClick={() => navigate('/')}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          ← Voltar ao Portal
        </button>
      </div>
    </div>
  );
}
```

#### 1.3 Página Desktop Split-Screen

**Arquivo:** `AppPortal/src/pages/EmbeddedModuleDesktop.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Dashboard } from './Dashboard';

interface EmbeddedModuleDesktopProps {
  moduleName: string;
  moduleUrl: string;
}

export function EmbeddedModuleDesktop({
  moduleName,
  moduleUrl,
}: EmbeddedModuleDesktopProps) {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cleanup memory leak
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
        iframeRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-screen h-screen flex bg-gray-50 overflow-hidden">
      {/* Left Side: Portal Dashboard (33%) */}
      <div className="w-1/3 h-screen overflow-y-auto bg-white border-r border-gray-200 shadow-md">
        <Dashboard />

        {/* Botão Voltar */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            ← Voltar
          </button>
        </div>
      </div>

      {/* Right Side: iPhone Preview (67%) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
        {/* iPhone Frame Mockup */}
        <div className="relative rounded-3xl border-8 border-gray-900 shadow-2xl overflow-hidden bg-black flex flex-col"
          style={{
            width: '375px',
            height: '812px',
            maxHeight: '100%'
          }}
        >
          {/* iPhone Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10"></div>

          {/* iframe (Smartphone Content) */}
          <iframe
            ref={iframeRef}
            src={moduleUrl}
            title={moduleName}
            className="flex-1 w-full border-none pt-1"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-storage"
          />

          {/* iPhone Home Indicator */}
          <div className="h-6 bg-black flex items-center justify-center">
            <div className="w-32 h-1 bg-gray-800 rounded-full"></div>
          </div>
        </div>

        {/* Info Badge */}
        <div className="absolute top-4 right-4 text-gray-600 text-sm bg-white px-3 py-2 rounded-lg shadow">
          <p className="font-semibold">📱 {moduleName}</p>
          <p className="text-xs text-gray-500">375px × 812px</p>
        </div>
      </div>
    </div>
  );
}
```

#### 1.4 Router com Detecção Adaptativa

**Arquivo:** `AppPortal/src/routes/EmbeddedModuleRouter.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { EmbeddedModuleMobile } from '@/pages/EmbeddedModuleMobile';
import { EmbeddedModuleDesktop } from '@/pages/EmbeddedModuleDesktop';

const modulesConfig: Record<string, { name: string; url: string }> = {
  stocktech: {
    name: 'StockTech',
    url: 'https://stocktech.avelarcompany.com.br'
  },
  avadmin: {
    name: 'AvAdmin',
    url: 'https://avadmin.avelarcompany.com.br'
  }
};

export function EmbeddedModuleRouter() {
  const { module } = useParams<{ module: string }>();
  const { isMobile } = useResponsive();

  const config = modulesConfig[module as keyof typeof modulesConfig];

  if (!config) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Módulo não encontrado</h1>
          <p className="text-red-700">Módulo '{module}' não está disponível</p>
        </div>
      </div>
    );
  }

  return isMobile ? (
    <EmbeddedModuleMobile moduleName={config.name} moduleUrl={config.url} />
  ) : (
    <EmbeddedModuleDesktop moduleName={config.name} moduleUrl={config.url} />
  );
}
```

#### 1.5 Main Routes

**Arquivo:** `AppPortal/src/app/layout.tsx` (updated)

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { EmbeddedModuleRouter } from '@/routes/EmbeddedModuleRouter';

export default function AppLayout() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Normal Portal Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Embedded Module Routes (Adaptive) */}
        <Route path="/:module" element={<EmbeddedModuleRouter />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### 1.6 Checklist Fase 1

- [ ] Hook `useResponsive` criado
- [ ] Componente `EmbeddedModuleMobile` criado
- [ ] Componente `EmbeddedModuleDesktop` criado
- [ ] Router `EmbeddedModuleRouter` criado
- [ ] Routes integradas no layout principal
- [ ] Testar em Mobile (<1024px)
- [ ] Testar em Desktop (>1024px)
- [ ] Memory leak cleanup funcionando
- [ ] Botão "Voltar" funcionando

---

## 🔐 Fase 2: Otimizações Críticas

### Duração: 3-4 dias
### Objetivo: Performance e segurança

#### 2.1 Bundle Sharing (Redux global)

**Arquivo:** `AppPortal/src/index.tsx` (updated)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { TanstackQueryProvider } from '@tanstack/react-query';

// Expor libs globais para iframes
window.__AVELAR_SHARED__ = {
  React,
  ReactDOM,
  axios,
  // Adicione outras libs pesadas aqui conforme necessário
};

// Log para verificação
console.log('✅ Shared libs available:', Object.keys(window.__AVELAR_SHARED__));

// ... resto do código
```

**Para StockTech:** `stocktech/vite.config.ts` (updated)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['react', 'react-dom', 'axios'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          axios: 'axios'
        }
      }
    }
  }
});
```

**Verificação:**
```bash
# Antes
npm run build
du -sh dist/  # ~500KB

# Depois
npm run build
du -sh dist/  # ~200KB (60% redução)
```

#### 2.2 Secure Token via PostMessage

**Arquivo:** `AppPortal/src/utils/secureAuth.ts`

```typescript
/**
 * Envia token para iframe de forma segura
 */
export async function sendTokenToIframe(
  iframe: HTMLIFrameElement,
  token: string,
  targetOrigin: string = 'https://stocktech.avelarcompany.com.br'
): Promise<void> {
  if (!iframe?.contentWindow) {
    throw new Error('Invalid iframe');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Token handshake timeout'));
    }, 5000);

    const messageId = `token_${Date.now()}_${Math.random()}`;

    const handler = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) {
        console.warn('Invalid origin:', event.origin);
        return;
      }

      if (
        event.data.type === 'TOKEN_ACK' &&
        event.data.messageId === messageId
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve();
      }
    };

    window.addEventListener('message', handler);

    iframe.contentWindow.postMessage(
      {
        type: 'AUTH_TOKEN',
        messageId,
        token,
        timestamp: Date.now(),
        expiresIn: 5000
      },
      targetOrigin
    );
  });
}
```

**Para StockTech:** `stocktech/src/utils/authReceiver.ts`

```typescript
/**
 * Setup receiver para token seguro
 */
export function setupSecureAuthReceiver() {
  window.addEventListener('message', (event) => {
    const expectedOrigin = 'https://app.avelarcompany.com.br';
    
    if (event.origin !== expectedOrigin) {
      console.error('Invalid origin');
      return;
    }

    if (event.data.type !== 'AUTH_TOKEN') {
      return;
    }

    const now = Date.now();
    const msgTime = event.data.timestamp;
    
    if (now - msgTime > event.data.expiresIn) {
      console.error('Token expired');
      return;
    }

    try {
      // Guardar em sessionStorage (mais seguro)
      sessionStorage.setItem('auth_token', event.data.token);

      // Confirmar recebimento
      if (event.source) {
        event.source.postMessage(
          {
            type: 'TOKEN_ACK',
            messageId: event.data.messageId
          },
          expectedOrigin
        );
      }
    } catch (error) {
      console.error('Auth setup failed:', error);
    }
  });
}

// Chamar ao iniciar
setupSecureAuthReceiver();
```

#### 2.3 Storage Isolation

**Arquivo:** `AppPortal/src/utils/isolatedStorage.ts`

```typescript
/**
 * Storage isolado por módulo
 */
export class IsolatedStorage {
  private prefix: string;

  constructor(moduleName: string) {
    this.prefix = `avelar_${moduleName}_`;
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(this.prefix + key, value);
  }

  getItem(key: string): string | null {
    return localStorage.getItem(this.prefix + key);
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Uso:
const portalStorage = new IsolatedStorage('portal');
portalStorage.setItem('theme', 'dark');

const stocktechStorage = new IsolatedStorage('stocktech');
stocktechStorage.setItem('theme', 'light'); // Sem conflito!
```

#### 2.4 CSS Namespacing (BEM)

**Arquivo:** `stocktech/src/styles/base.css` (exemplo)

```css
/* Prefixar tudo com .stocktech */
.stocktech {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
}

.stocktech__container {
  padding: 1rem;
}

.stocktech__header {
  background: var(--color-primary);
}

.stocktech__button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}

.stocktech__button--primary {
  background: var(--color-primary);
  color: white;
}

.stocktech__button--primary:hover {
  background: var(--color-secondary);
}

/* Nunca sobrescreve .button ou .container do Portal */
```

#### 2.5 Checklist Fase 2

- [ ] Bundle sharing implementado
- [ ] StockTech bundle reduzido para ~200KB
- [ ] Secure token via PostMessage funcionando
- [ ] Storage isolation implementado
- [ ] CSS namespacing aplicado em StockTech
- [ ] Sem conflito de estilos no iframe
- [ ] Testar múltiplos cliques (memory não cresce)
- [ ] Testar token expiration

---

## ⚡ Fase 3: Polish & Performance

### Duração: 2-3 dias
### Objetivo: UX e performance final

#### 3.1 Virtual Scrolling

**Arquivo:** `stocktech/src/components/VirtualizedList.tsx`

```typescript
import { FixedSizeList } from 'react-window';
import { Product } from '@/types';

interface VirtualizedListProps {
  products: Product[];
}

export function VirtualizedList({ products }: VirtualizedListProps) {
  const itemSize = 60;

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = products[index];
    
    return (
      <div style={style} className="stocktech__product-item px-4">
        <div className="flex justify-between items-center h-full">
          <div>
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-gray-500 text-sm">{product.sku}</p>
          </div>
          <span className="font-bold">${product.price.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={itemSize}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

#### 3.2 Optimized Resize

**Arquivo:** `AppPortal/src/hooks/useOptimizedResize.ts`

```typescript
import { useEffect, useRef } from 'react';

/**
 * ResizeObserver com throttling para evitar layout thrashing
 */
export function useOptimizedResize(
  callback: () => void,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        callback();
      }, delay);
    });

    observer.observe(document.body);

    return () => {
      clearTimeout(timeoutRef.current);
      observer.disconnect();
    };
  }, [callback, delay]);
}
```

#### 3.3 Module Preloading

**Arquivo:** `AppPortal/src/utils/preloadModules.ts`

```typescript
/**
 * Preload dos módulos para melhorar performance
 */
export function preloadModule(moduleUrl: string) {
  // 1. DNS Prefetch
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = new URL(moduleUrl).origin;
  document.head.appendChild(dnsPrefetch);

  // 2. Preconnect
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = new URL(moduleUrl).origin;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);

  // 3. Prefetch (lower priority)
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.as = 'document';
  prefetch.href = moduleUrl;
  document.head.appendChild(prefetch);
}

// Usar ao iniciar Portal
export function initializePreloading() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadModule('https://stocktech.avelarcompany.com.br');
      preloadModule('https://avadmin.avelarcompany.com.br');
    });
  } else {
    setTimeout(() => {
      preloadModule('https://stocktech.avelarcompany.com.br');
      preloadModule('https://avadmin.avelarcompany.com.br');
    }, 2000);
  }
}
```

**No Dashboard:**
```typescript
useEffect(() => {
  initializePreloading();
}, []);
```

#### 3.4 Service Worker Cache

**Arquivo:** `AppPortal/public/sw.js`

```javascript
const CACHE_VERSION = 'modules-v1';
const CACHE_URLS = [
  'https://stocktech.avelarcompany.com.br',
  'https://avadmin.avelarcompany.com.br'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache estratégia para módulos
  if (CACHE_URLS.some(cacheUrl => url.href.startsWith(cacheUrl))) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) => {
        return cache.match(request).then((response) => {
          return response || fetch(request).then((res) => {
            cache.put(request, res.clone());
            return res;
          });
        });
      })
    );
  }
});
```

**Registrar no App Portal:**
```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.log('Service Worker registration failed:', err);
  });
}
```

#### 3.5 Performance Monitoring

**Arquivo:** `AppPortal/src/utils/performanceMonitoring.ts`

```typescript
/**
 * Monitorar performance da aplicação
 */
export function startPerformanceMonitoring() {
  // 1. Medir Core Web Vitals
  if ('web-vital' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }

  // 2. Medir memory
  if (performance.memory) {
    setInterval(() => {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.jsHeapSizeLimit;
      const percent = (used / total) * 100;
      
      console.log(`💾 Memory: ${(used / 1048576).toFixed(1)}MB / ${(total / 1048576).toFixed(1)}MB (${percent.toFixed(1)}%)`);
      
      if (percent > 90) {
        console.warn('⚠️ High memory usage!');
      }
    }, 5000);
  }

  // 3. Medir FPS
  let fps = 0;
  let lastTime = performance.now();
  
  function measureFps() {
    const currentTime = performance.now();
    fps = Math.round(1000 / (currentTime - lastTime));
    lastTime = currentTime;
    
    if (fps < 50) {
      console.warn(`⚠️ Low FPS: ${fps}`);
    }
    
    requestAnimationFrame(measureFps);
  }
  
  requestAnimationFrame(measureFps);
}

// Chamar ao iniciar
startPerformanceMonitoring();
```

#### 3.6 Checklist Fase 3

- [ ] Virtual scrolling implementado em listas grandes
- [ ] ResizeObserver com throttling funcionando
- [ ] Module preloading ativado
- [ ] Service Worker registrado
- [ ] Performance monitoring ativo
- [ ] Testar Lighthouse scores
- [ ] Testar em slow 4G (DevTools)
- [ ] Testar em slow 3G (DevTools)
- [ ] Memory stable após múltiplos cliques
- [ ] FPS consistente em 60fps

---

## ✅ Checklist de Deploy

### Antes de Deploy

- [ ] Todas as 3 fases implementadas
- [ ] Sem console errors
- [ ] Sem console warnings
- [ ] Memory monitoring OK
- [ ] FPS consistente (60fps)
- [ ] Responsive OK (Mobile <1024px e Desktop >1024px)
- [ ] Token security OK
- [ ] Storage isolation OK
- [ ] Virtual scrolling OK

### Testes de Performance

```bash
# Lighthouse
npm run build
npx lighthouse https://app.avelarcompany.com.br

# Performance ideal
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 95+
```

### Monitoramento Pós-Deploy

1. **Real User Monitoring (RUM)**
   - Google Analytics - Web Vitals
   - Sentry - Error tracking
   - LogRocket - Session replay

2. **Performance Budgets**
   - Bundle size: <300KB
   - Time to Interactive: <2s (4G)
   - Memory: <200MB (Portal + iframe)

3. **Alertas**
   - FPS < 50 por 5s
   - Memory > 300MB
   - Error rate > 1%

---

## 📊 Resultados Esperados

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| **Bundle Total** | 1250KB | 800KB | -36% |
| **Load Time (4G)** | 6-8s | 2-3s | -65% |
| **Time to Interactive** | 8-10s | 3-4s | -65% |
| **Memory (idle)** | 180MB | 150MB | -17% |
| **Scroll FPS** | 30fps | 60fps | +100% |
| **Network Requests** | 45 | 25 | -44% |
| **CSS Conflicts** | 5-10 | 0 | ✅ |

---

## 🎯 Resumo de Implementação

1. **Fase 1:** Setup básico do iframe adaptativo (3-4 dias)
2. **Fase 2:** Otimizações críticas de performance (3-4 dias)
3. **Fase 3:** Polish final e refinamentos (2-3 dias)

**Total:** 8-11 dias de desenvolvimento

**Resultado Final:** Aplicação completa com iframe super otimizado, sem sacrificar performance ou segurança!

---

## 📞 Suporte & Troubleshooting

### Common Issues

| Problema | Solução |
|----------|---------|
| iframe não carrega | Verificar sandbox attributes |
| Token não chega | Verificar HTTPS e origem |
| Memory cresce | Verificar cleanup em unmount |
| CSS conflita | Verificar BEM naming |
| FPS baixo | Ativar virtual scrolling |

### Performance Debug

```javascript
// DevTools Console
window.__AVELAR_SHARED__ // Ver libs compartilhadas
performance.memory // Ver uso de memória
performance.navigation.timing // Ver timeline
```

---

**Documento criado em:** 25/01/2026  
**Versão:** 1.0  
**Status:** Pronto para Implementação ✅
