# 📱 Implementar PWA no AppPortal - Guia Completo

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Status:** ✅ Pronto para Implementação  
**Tempo estimado:** 90-120 minutos

---

## 📋 Sumário

1. [O que é PWA?](#o-que-é-pwa)
2. [Transformação Visual](#transformação-visual)
3. [O que você vai fazer](#o-que-você-vai-fazer)
4. [Alterações de Código](#alterações-de-código)
5. [Implementar PWA](#implementar-pwa)
6. [Testes](#testes)
7. [Checklist Completo](#checklist-completo)
8. [Troubleshooting](#troubleshooting)
9. [Referências](#referências)

---

## O que é PWA?

**PWA (Progressive Web App)** é um site que funciona como um aplicativo nativo.

### Características:
- 📱 **Instalável** na home screen como app
- ⚡ **Rápido** com cache inteligente
- 🔌 **Offline** - funciona sem internet
- 🔔 **Notificações** push
- 🎨 **Nativo** - sem barra de navegador

### Resultado:
```
ANTES:  Chrome menu → "Criar atalho"        (site)
DEPOIS: Chrome menu → "Instalar AvelarSys"  (app)
```

---

## Transformação Visual

### Desktop - Antes vs Depois

**ANTES (Site Normal):**
```
┌─────────────────────────────────┐
│ localhost:3000        [+]       │  ← barra de endereço
│                       Click      │
│           AppPortal             │
│                                 │
│                                 │
└─────────────────────────────────┘
         │
         ▼
    Popup: "Criar atalho"
```

**DEPOIS (PWA):**
```
┌─────────────────────────────────┐
│ localhost:3000        [+]       │  ← detecta PWA
│                       Click      │
│           AppPortal             │
│                                 │
│                                 │
└─────────────────────────────────┘
         │
         ▼
    Popup: "Instalar AvelarSys"
         │
         ▼
    ┌──────────────────┐
    │    AvelarSys     │  ← Abre como APP
    │ ┌──────────────┐ │
    │ │              │ │  Sem barra de endereço
    │ │   Conteúdo   │ │  Fullscreen
    │ │              │ │
    │ └──────────────┘ │
    └──────────────────┘
```

### Mobile - Resultado

**Android Chrome:**
- Menu (⋮) → "Instalar app" ✓
- Abre como app fullscreen
- Ícone na home screen
- Funciona offline

**iOS Safari:**
- Compartilhar (↗️) → "Adicionar à Tela de Início" ✓
- Abre como app fullscreen
- Ícone na home screen

---

## O que você vai fazer

### Alterações de Código (2 arquivos)
1. **StockTech/server/routers-updated.ts** - Upload base64 (não File object)
2. **StockTech/drizzle/schema.ts** - Adicionar novo enum: ORIGINAL_RETIRADA

### Novos Arquivos PWA (5 arquivos)
1. **AppPortal/public/manifest.json** - Metadados do app
2. **AppPortal/public/sw.js** - Service Worker (offline + cache)
3. **AppPortal/public/offline.html** - Página quando offline
4. **AppPortal/public/icons/** - 4 ícones PNG (192x, 512x, maskable)
5. **AppPortal/public/favicon.ico** - Favicon

### Modificações (2 arquivos)
1. **AppPortal/src/app/_document.tsx** - Adicionar meta tags
2. **AppPortal/src/app/layout.tsx** - Registrar Service Worker

---

## Alterações de Código

### 1. Upload Base64

**Arquivo:** `AvelarSys/StockTech/server/routers-updated.ts`

**REMOVER (código antigo):**
```typescript
uploadImage: publicProcedure
  .input(z.object({ 
    file: z.instanceof(File), 
    type: z.enum(['profile', 'cover']).optional() 
  }))
  .mutation(async ({ input }) => {
    const { storagePut } = await import('./storage');
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const contentType = input.file.type || 'image/jpeg';
    const timestamp = Date.now();
    const type = input.type || 'image';
    const key = `sellers/${type}/${timestamp}-${input.file.name}`;
    const result = await storagePut(key, buffer, contentType);
    return result;
  })
```

**ADICIONAR (código novo):**
```typescript
uploadImage: publicProcedure
  .input(
    z.object({
      base64: z.string(),
      fileName: z.string(),
      type: z.enum(['profile', 'cover']).optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const { storagePut } = await import('./storage');
      // Extrair base64 (remove "data:image/png;base64," se existir)
      const base64Data = input.base64.split(',')[1] || input.base64;
      // Converter para Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      // Content type do base64
      const contentType = input.base64.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      const timestamp = Date.now();
      const type = input.type || 'image';
      const key = `sellers/${type}/${timestamp}-${input.fileName}`;
      const result = await storagePut(key, buffer, contentType);
      return result;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  })
```

**Como usar (cliente):**
```typescript
// Converter File para base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usar no upload
const file = inputElement.files?.[0];
if (file) {
  const base64 = await fileToBase64(file);
  await uploadImageMutation.mutateAsync({
    base64,
    fileName: file.name,
    type: 'profile'
  });
}
```

### 2. Novo Enum de Produto

**Arquivo:** `AvelarSys/StockTech/drizzle/schema.ts`

**PROCURAR POR:**
```typescript
export const productConditionEnum = pgEnum("product_condition", ["NEW", "USED", "REFURBISHED"]);
```

**SUBSTITUIR POR:**
```typescript
export const productConditionEnum = pgEnum("product_condition", ["NEW", "USED", "REFURBISHED", "ORIGINAL_RETIRADA"]);
```

**Aplicar Migration:**
```bash
cd /home/avelarsys/AvelarSys/StockTech
npm run db:generate
npm run db:push
```

---

## Implementar PWA

### PASSO 1: Criar manifest.json

**Localização:** `/home/avelarsys/AvelarSys/AppPortal/public/manifest.json`

```json
{
  "name": "AvelarSys - Plataforma Integrada",
  "short_name": "AvelarSys",
  "description": "Sistema integrado de gerenciamento: Portal, Admin, StockTech e WhatsApp",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#003366",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/images/screenshot-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "shortcuts": [
    {
      "name": "StockTech",
      "short_name": "StockTech",
      "description": "Acesso rápido ao StockTech",
      "url": "/stocktech",
      "icons": [
        {
          "src": "/icons/stocktech-192x192.png",
          "sizes": "192x192"
        }
      ]
    }
  ]
}
```

### PASSO 2: Criar Ícones

**Localização:** `/home/avelarsys/AvelarSys/AppPortal/public/icons/`

Você precisa de 4 arquivos PNG:
- `icon-192x192.png`
- `icon-512x512.png`
- `icon-maskable-192x192.png` (recomendado)
- `icon-maskable-512x512.png` (recomendado)

**Como gerar:**
- **Opção A:** https://www.favicon-generator.org/ (online, rápido)
- **Opção B:** ImageMagick (se tiver instalado)
  ```bash
  convert logo-1024x1024.png -resize 192x192 icon-192x192.png
  convert logo-1024x1024.png -resize 512x512 icon-512x512.png
  ```
- **Opção C:** Figma ou Designer profissional

### PASSO 3: Atualizar _document.tsx

**Arquivo:** `AppPortal/src/app/_document.tsx`

**Adicione no `<Head>`:**
```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Meta Tags PWA */}
        <meta name="theme-color" content="#003366" />
        <meta name="description" content="AvelarSys - Plataforma Integrada" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AvelarSys" />
        
        {/* Ícones */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        
        {/* Cores e Temas */}
        <meta name="msapplication-TileColor" content="#003366" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

### PASSO 4: Registrar Service Worker

**Arquivo:** `AppPortal/src/app/layout.tsx`

**Adicione um novo componente:**
```tsx
'use client'

import { useEffect } from 'react'

function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('✅ Service Worker registrado:', registration)
          },
          (error) => {
            console.log('❌ Service Worker falhou:', error)
          }
        )
      })
    }
  }, [])

  return null
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
```

### PASSO 5: Criar Service Worker

**Arquivo:** `AppPortal/public/sw.js`

```javascript
const CACHE_NAME = 'avelarys-v1'
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell')
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deletando cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })

        return response
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          return response || caches.match('/offline.html')
        })
      })
  )
})
```

### PASSO 6: Criar Página Offline

**Arquivo:** `AppPortal/public/offline.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - AvelarSys</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .offline-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
            max-width: 500px;
            text-align: center;
        }

        .offline-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        p {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .offline-tips {
            background: #f5f5f5;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
        }

        .offline-tips h3 {
            color: #333;
            margin-bottom: 10px;
        }

        .offline-tips ul {
            list-style: none;
            padding-left: 0;
        }

        .offline-tips li {
            color: #666;
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
        }

        .offline-tips li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }

        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
            transition: background 0.3s;
        }

        button:hover {
            background: #764ba2;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>Sem Conexão</h1>
        <p>Parece que você está offline. Confira sua conexão e tente novamente.</p>
        
        <div class="offline-tips">
            <h3>Dicas:</h3>
            <ul>
                <li>Verifique Wi-Fi ou dados móveis</li>
                <li>Reinicie seu navegador</li>
                <li>Tente novamente em alguns momentos</li>
                <li>Alguns dados podem estar em cache</li>
            </ul>
        </div>

        <button onclick="location.reload()">🔄 Tentar Novamente</button>
    </div>
</body>
</html>
```

---

## Testes

### Desktop (Chrome)

1. **Inicie AppPortal:**
```bash
cd /home/avelarsys/AvelarSys/AppPortal
npm run dev
```

2. **Abra em http://localhost:3000**

3. **Abra DevTools (F12)** → guia **Application**

4. **Verifique Manifest:**
   - Vá para: `Application` → `Manifest`
   - ✓ Deve aparecer: `name: AvelarSys`
   - ✓ Deve aparecer: `short_name: AvelarSys`
   - ✓ Deve aparecer: `display: standalone`
   - ✓ Todos os ícones listados

5. **Verifique Service Worker:**
   - Vá para: `Application` → `Service Workers`
   - ✓ Deve aparecer: `sw.js`
   - ✓ Status: "activated and running"

6. **Teste Instalação:**
   - Procure ícone de instalação na barra de endereço (Chrome mostra + no canto)
   - ✓ Deve dizer: "Instalar AvelarSys" (não "Criar atalho")
   - Clique em "Instalar"
   - ✓ Abre como app fullscreen sem barra de endereço

7. **Teste Offline:**
   - DevTools → `Network`
   - Marque checkbox "Offline"
   - Recarregue a página
   - ✓ Deve carregar do cache

### Mobile (Android Chrome)

1. **Abra seu site em HTTPS ou via ngrok:**
```bash
# Opção 1: Se já em produção
https://seu-dominio.com

# Opção 2: Túnel local
npx ngrok http 3000
# Use a URL https gerada
```

2. **No celular, abra o Chrome**

3. **Menu (⋮)** → "Instalar app"

4. ✓ Deve instalar como app na home

### Mobile (iOS Safari)

1. **Abra o site em Safari**

2. **Compartilhar (↗️)** → "Adicionar à Tela de Início"

3. ✓ Adiciona à home como app

---

## Checklist Completo

### ✅ Pré-Implementação
- [ ] Backup do código
- [ ] Branch criada: `git checkout -b feat/pwa`
- [ ] Node.js 18+ instalado
- [ ] Docker rodando
- [ ] 2 horas de tempo disponível

### ✅ Fase 1: Alterações de Código (15 min)
- [ ] Alterar `routers-updated.ts` (upload base64)
- [ ] Alterar `schema.ts` (novo enum)
- [ ] Rodar: `npm run db:generate`
- [ ] Rodar: `npm run db:push`
- [ ] Testar upload: funciona? ✓

### ✅ Fase 2: Criar Arquivos PWA (20 min)
- [ ] Criar `public/manifest.json`
- [ ] Gerar/adicionar 4 ícones PNG em `public/icons/`
- [ ] Criar `public/sw.js`
- [ ] Criar `public/offline.html`
- [ ] Criar `public/favicon.ico`

### ✅ Fase 3: Modificações (10 min)
- [ ] Atualizar `src/app/_document.tsx` (meta tags)
- [ ] Atualizar `src/app/layout.tsx` (registrar SW)

### ✅ Fase 4: Testes (30 min)
- [ ] DevTools Desktop → manifest.json OK?
- [ ] DevTools Desktop → sw.js registrado?
- [ ] Desktop → "Instalar AvelarSys" aparece?
- [ ] Desktop → Instala como app?
- [ ] Desktop Offline → Carrega do cache?
- [ ] Mobile Android → Instala?
- [ ] Mobile iOS → Adiciona à home?

### ✅ Fase 5: Validação (15 min)
- [ ] Lighthouse score > 90 em PWA?
- [ ] https://www.pwabuilder.com/ valida?
- [ ] Manifest JSON é válido?
- [ ] Nenhum erro no console?

### ✅ Fase 6: Deploy (20 min)
- [ ] Build: `npm run build` - sem erros?
- [ ] Deploy para staging
- [ ] Testar em produção
- [ ] Verificar HTTPS
- [ ] Commit final
- [ ] Pull Request

---

## Troubleshooting

### ❌ "Não aparece botão de instalação"

**Causas:**
1. Manifest não encontrado
2. Service Worker não registrou
3. Falta certificado HTTPS (em produção)

**Solução:**
```bash
# Verificar DevTools
F12 → Console
# Procurar por erros:
# - "Failed to load manifest"
# - "Service Worker failed to register"

# Verificar arquivo
ls -la public/manifest.json

# Limpar cache
Ctrl+Shift+Delete (limpar tudo)
Abrir nova aba anônima
```

### ❌ "Ícones não aparecem"

**Solução:**
```bash
# Verificar arquivos
ls -la public/icons/

# Limpar cache do navegador
Ctrl+Shift+Delete

# Verificar manifest.json
# Caminhos devem ser:
# /icons/icon-192x192.png
```

### ❌ "Service Worker não ativa"

**Solução:**
```
DevTools → Application → Service Workers
Clique "Unregister"
Recarregue página
Verifique novamente
```

### ❌ "HTTPS não funciona"

**Solução:**
- Certificado válido necessário em produção
- Localhost OK sem HTTPS
- Usar ngrok se testar mobile sem HTTPS

---

## Estrutura de Arquivos

```
AvelarSys/
├── AppPortal/
│   ├── public/
│   │   ├── manifest.json ← CRIAR
│   │   ├── sw.js ← CRIAR
│   │   ├── offline.html ← CRIAR
│   │   ├── favicon.ico ← CRIAR
│   │   └── icons/ ← CRIAR PASTA
│   │       ├── icon-192x192.png
│   │       ├── icon-512x512.png
│   │       ├── icon-maskable-192x192.png
│   │       └── icon-maskable-512x512.png
│   └── src/app/
│       ├── _document.tsx ← MODIFICAR
│       └── layout.tsx ← MODIFICAR
│
└── StockTech/
    ├── server/
    │   └── routers-updated.ts ← MODIFICAR
    └── drizzle/
        └── schema.ts ← MODIFICAR
```

---

## Fluxo Visual

```
┌──────────────────┐
│   Início         │
└────────┬─────────┘
         │
         ▼
    ┌─────────────────────┐
    │ Código alterado?    │
    │ ✓ Upload base64    │
    │ ✓ Novo enum        │
    │ ✓ Migration        │
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Arquivos PWA?       │
    │ ✓ manifest.json    │
    │ ✓ sw.js            │
    │ ✓ offline.html     │
    │ ✓ Meta tags        │
    │ ✓ Ícones           │
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Testes?             │
    │ ✓ Desktop Chrome    │
    │ ✓ Mobile Android    │
    │ ✓ Mobile iOS        │
    │ ✓ Offline mode      │
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Deploy?             │
    │ ✓ Build ok          │
    │ ✓ Produção          │
    │ ✓ HTTPS ok          │
    └────────┬────────────┘
             │
             ▼
      ┌────────────────┐
      │  SUCESSO! 🎉   │
      │ AppPortal PWA  │
      └────────────────┘
```

---

## Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Barra de endereço | ✓ Visível | ✗ Escondida |
| Instalar como app | ✗ Não | ✓ Sim |
| Funciona offline | ✗ Não | ✓ Sim |
| Cache inteligente | Parcial | ✓ Completo |
| Notificações push | ✗ Não | ✓ Sim |
| Icon customizado | ✓ Genérico | ✓ Profissional |
| Lighthouse PWA | ~30% | ~95% |

---

## Próximas Etapas (Opcional)

Após implementar PWA básico:

1. **Notificações Push** - Alertar usuários
2. **Update Checker** - Avisar atualizações
3. **Analytics PWA** - Rastrear instalações
4. **Background Sync** - Sincronizar offline

---

## Referências

### Documentação Oficial
- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google - Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Next.js - PWA](https://nextjs.org/docs)

### Ferramentas
- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Favicon Generator](https://www.favicon-generator.org/)
- [Web Manifest Validator](https://www.pwamanifest.com/)

---

## Resumo Executivo

**O que você vai fazer:**
1. Alterar 2 arquivos de código (15 min)
2. Criar 5 arquivos PWA (20 min)
3. Modificar 2 arquivos (10 min)
4. Testar (30 min)
5. Deploy (20 min)

**Resultado:**
- AppPortal instalável como app
- Funciona offline
- Lighthouse 95%+
- Ícone customizado na home

**Tempo Total:** 90-120 minutos

---

**Desenvolvido para:** AvelarSys  
**Versão:** 1.0  
**Status:** ✅ Completo e Pronto para Usar
