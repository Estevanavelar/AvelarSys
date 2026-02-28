# 📱 Guia de Mobilização do Sistema AvelarSys para Smartphones

**Versão:** 1.0  
**Data de Criação:** Janeiro 2026  
**Objetivo:** Estruturar todo o sistema AvelarSys para funcionar otimizado em smartphones  
**Foco:** Layout responsivo, UX mobile-first, performance, acessibilidade

---

## 📋 Sumário Executivo

Este documento fornece um guia estratégico e prático para transformar o sistema AvelarSys (composto por AppPortal, AvAdmin, StockTech, WPPConnect e AxCell-OS legado) em uma plataforma totalmente otimizada para smartphones.

**Princípio Fundamental:** O sistema foi projetado para smartphones. Todas as páginas, módulos e componentes devem funcionar perfeitamente em telas pequenas (320px a 600px).

---

## 🎯 Objetivos da Mobilização

1. ✅ Layout responsivo em 100% das páginas
2. ✅ Touch-first design para todas as interações
3. ✅ Performance otimizada para conexões 3G/4G
4. ✅ Acessibilidade total (WCAG 2.1 AA)
5. ✅ Componentes adaptativos por tamanho de tela
6. ✅ Navegação simplificada para mobile
7. ✅ Offline-first quando possível
8. ✅ Dados carregados dinamicamente (lazy loading)

---

## 📊 Estrutura do Sistema AvelarSys

### Módulos Principais

| Módulo | Tecnologia | Porta | Status | Prioridade Mobile |
|--------|-----------|-------|--------|------------------|
| **AppPortal** | Next.js | 3000 | ✅ | 🔴 CRÍTICA |
| **AvAdmin Frontend** | Next.js | 3001 | ✅ | 🟡 ALTA |
| **AvAdmin Backend** | FastAPI | 8000 | ✅ | - |
| **StockTech Frontend** | Vite/React | 3002 | ✅ | 🔴 CRÍTICA |
| **StockTech Backend** | Express/tRPC | 8002 | ✅ | - |
| **WPPConnect** | Node.js | 8003 | ✅ | 🟡 ALTA |
| **AxCell-OS** | PHP CodeIgniter | Host | ✅ | 🟡 ALTA |

### Páginas e Componentes por Módulo

#### 1️⃣ AppPortal (Portal Unificado)
- **Login** (`/login`)
- **Dashboard** (`/dashboard`)
- **Seleção de Módulo** (`/select-module`)
- **Registro** (`/register/...`)
  - Tipo de Usuário
  - Dados CPF/CNPJ
  - Seleção de Plano
  - Serviços
  - Sucesso

#### 2️⃣ AvAdmin Frontend (Painel Admin)
- **Login** (`/login`)
- **Dashboard** (`/dashboard`)
- **Gerenciamento de Usuários** (`/dashboard/users`)
- **Gerenciamento de Contas** (`/dashboard/accounts`)
- **Faturamento** (`/dashboard/billing`)
- **Planos** (`/dashboard/plans`)
- **WhatsApp** (`/dashboard/whatsapp`)
- **Configurações** (`/dashboard/settings`)
- **Sem Módulos** (`/no-modules`)

#### 3️⃣ StockTech (Gestão de Estoque)
- **Dashboard** (visualização geral)
- **Pedidos** (listar, criar, editar)
- **Inventário** (produtos, estoque)
- **Clientes** (gerenciamento)
- **Relatórios** (vendas, performance)
- **PDV** (ponto de venda)
- **Entregas** (rastreamento)
- **Financeiro** (caixa, receitas)
- **Catálogo** (gestão de produtos)

#### 4️⃣ WPPConnect (WhatsApp)
- **Dashboard** (status de conexão)
- **Mensagens** (envio/recebimento)
- **Configuração** (credenciais)
- **Histórico** (logs de mensagens)

#### 5️⃣ AxCell-OS (Legado PHP)
- **AT** (`/AT/`)
  - Dashboard
  - Relatórios
  - Configurações
- **IV** (`/IV/`)
  - Dashboard
  - Configurações
- **PP** (`/PP/`)
  - Dashboard
  - Configurações

---

## 🏗️ Arquitetura de Mobilização por Módulo

### FASE 1: Fundação (Componentes Base)

#### 1.1. Sistema de Grid Responsivo
```
Implementar breakpoints:
- Mobile: < 640px (Tailwind: default)
- Tablet Small: 640px - 768px (sm:)
- Tablet Large: 768px - 1024px (md:)
- Desktop: > 1024px (lg:)

Abordagem: Mobile-first (comece do menor, expanda para maior)
```

#### 1.2. Componentes de Navegação Mobile
- **Bottom Navigation Bar** (menu fixo na base)
- **Top Header Simplificado** (logo + menu)
- **Drawer/Sidebar** (aparece ao lado ou modal)
- **Breadcrumbs** (para navegação)
- **Tabs Deslizáveis** (horizontal scroll)
- **Accordions** (para expandir/recolher)

#### 1.3. Componentes de Formulários Mobile
- **Inputs Otimizados** (teclado virtual compatível)
- **Select Adaptativos** (dropdowns vs modais)
- **Date Pickers** (mobile-friendly)
- **Checkboxes/Radios** (área de toque ampla)
- **Buttons** (mínimo 44px de altura)
- **Spinners** (feedback de carregamento)

#### 1.4. Componentes de Dados
- **Cards Responsivos** (expandem em mobile)
- **Tabelas** (transformam em cards em mobile)
- **Listas** (scroll vertical)
- **Paginação** (setas grandes para touch)
- **Filtros** (modal ou sidebar)

---

### FASE 2: AppPortal (Prioridade Crítica)

#### 2.1. Página de Login
**Estado Atual:** ✅ Provavelmente responsivo  
**Otimizações Necessárias:**
- [ ] Aumentar altura mínima dos inputs (44px)
- [ ] Expandir botão de login para 100% da largura
- [ ] Adicionar indicador de força de senha
- [ ] Mostrar/ocultar senha com ícone grande
- [ ] Melhorar espaçamento vertical (toque confortável)
- [ ] Adicionar feedback tátil (ripple effects)
- [ ] Testar com teclados virtuais de diferentes dispositivos

**Breakpoints Mobile:**
- 320px: Logo reduzido, inputs em full width
- 480px: Formulário expandido com mais espaço
- 640px+: Versão desktop

#### 2.2. Página de Registro
**Componentes a Otimizar:**
- **Select-Type Page** → Botões touch-friendly (50px altura)
- **CPF/CNPJ Page** → Máscara de input, teclado numérico
- **Plan Page** → Cards deslizáveis horizontalmente
- **Services Page** → Checkboxes com espaço amplo
- **Success Page** → CTA grande e destaque

**UX Mobile:**
- Progresso visual (steps) com números grandes
- Volta para passo anterior (botão voltar)
- Salvar rascunho automaticamente
- Validação em tempo real com mensagens claras

#### 2.3. Dashboard (AppPortal)
**Layout Mobile:**
- Menu lateral → Bottom navigation
- Cards de módulos → Grid 1 coluna
- Gráficos → Versão simplificada com scroll horizontal
- Ações rápidas → Botões destacados
- Notificações → Toast/snackbar no topo

**Funcionalidades Mobile First:**
- [ ] Drawer de navegação com ícones grandes
- [ ] Atalhos rápidos (shortcuts) para módulos
- [ ] Cards com 1 coluna em mobile
- [ ] Expansível para 2 colunas em tablet
- [ ] Expandível para 3+ colunas em desktop

#### 2.4. Seleção de Módulo
**Layout:**
- [ ] Cards/Botões grandes (mínimo 60px altura)
- [ ] Full width até 640px
- [ ] Grid 2x em tablet (sm:)
- [ ] Grid 3x+ em desktop

---

### FASE 3: StockTech (Prioridade Crítica)

#### 3.1. Dashboard StockTech
**Componentes Chave:**
- **Resumo de Vendas** → Card principal em destaque
- **Gráficos** → Simplificados, scroll horizontal se necessário
- **Status de Entrega** → Badges com cores (verde/laranja/vermelho)
- **Ações Rápidas** → Botões grandes (Novo Pedido, Novo Produto)

**Mobile Design:**
- [ ] 1 coluna principal (full width)
- [ ] Cartões empilhados verticalmente
- [ ] Gráficos com scroll horizontal
- [ ] FAB (Floating Action Button) para ação principal
- [ ] Ícones grandes (24px+) para ações

#### 3.2. Listagem de Pedidos
**Estado Crítico:** Tabelas desktop não funcionam bem em mobile

**Transformação Necessária:**
- [ ] Converter tabelas em cards (1 por linha)
- [ ] Cada card mostra: ID, Cliente, Valor, Status, Data
- [ ] Ação: Tap para abrir detalhe
- [ ] Swipe: Ações rápidas (editar, deletar, completar)
- [ ] Filtros em modal ou drawer
- [ ] Paginação simples (Próximo/Anterior)

**Card de Pedido:**
```
┌─────────────────────┐
│ #1234 | Status 🟢  │
│ Cliente X           │
│ R$ 1.250,00        │
│ 15/01/2026         │
│ [Editar] [Detalhe] │
└─────────────────────┘
```

#### 3.3. Detalhes do Pedido
- [ ] Informações principais em cards expansíveis
- [ ] Timeline de status (vertical)
- [ ] Itens em lista scrollável
- [ ] Ações no bottom sheet
- [ ] Editar inline quando possível

#### 3.4. Criar/Editar Pedido
- [ ] Formulário em wizard (passos)
- [ ] Passo 1: Cliente
- [ ] Passo 2: Produtos
- [ ] Passo 3: Revisão
- [ ] Cada passo adaptado para mobile

**Seleção de Produtos (Mobile):**
- [ ] Busca com autocomplete
- [ ] Cards de produtos (imagem, nome, preço)
- [ ] Quantidade com +/- buttons (44px+ altura)
- [ ] Lista de selecionados abaixo
- [ ] Totalizador fixo no bottom

#### 3.5. Inventário/Produtos
- [ ] Listagem como cards
- [ ] Busca/filtro em topo
- [ ] Cada card: imagem, nome, SKU, preço, estoque
- [ ] Tap para detalhes ou edição
- [ ] FAB para adicionar novo produto

#### 3.6. PDV (Ponto de Venda)
**Crítico para Mobile (vendedores em campo)**
- [ ] Layout em duas seções: Produtos | Carrinho
- [ ] Listagem de produtos em grid 2 colunas
- [ ] Carrinho como drawer no lado direito (swipe left)
- [ ] Números grandes e táteis
- [ ] Teclado numérico para quantidades
- [ ] Botões de pagamento destacados
- [ ] Confirmação com QR code ou NFC

#### 3.7. Rastreamento de Entregas
- [ ] Mapa em full screen
- [ ] Ícones de status grandes
- [ ] Timeline de eventos expandível
- [ ] Botão de chamar motorista
- [ ] Notificações push de atualizações

#### 3.8. Relatórios
- [ ] Gráficos simplificados para mobile
- [ ] Tabs para trocar entre tipos de relatórios
- [ ] Período selecionável em modal datepicker
- [ ] Dados em cards/tabelas simples
- [ ] Exportar opção com formato adaptado

---

### FASE 4: AvAdmin (Prioridade Alta)

#### 4.1. Dashboard Admin
- [ ] Cards com KPIs principais
- [ ] Gráficos simplificados
- [ ] Listagem de usuários em cards
- [ ] Ações em menu suspenso (⋮)

#### 4.2. Gerenciamento de Usuários
- [ ] Tabelas → Cards
- [ ] Filtros em drawer
- [ ] Busca com autocomplete
- [ ] Ações: Ver, Editar, Deletar
- [ ] Confirmação em modal

#### 4.3. Gerenciamento de Contas
- [ ] Cards por conta
- [ ] Informações principais visíveis
- [ ] Ações expandíveis
- [ ] Formulário de edição em modal fullscreen

#### 4.4. Faturamento
- [ ] Listagem de faturas em cards
- [ ] Status com cores
- [ ] PDF download button
- [ ] Filtro por período

#### 4.5. Planos
- [ ] Cards grandes destacando funcionalidades
- [ ] Comparação entre planos (tabela transformada)
- [ ] Botão de upgrade/downgrade
- [ ] Modal de confirmação

#### 4.6. Configurações
- [ ] Menu vertical simples
- [ ] Cada setting em sua própria página
- [ ] Switches grandes (44px+)
- [ ] Inputs confortáveis
- [ ] Salvar automático ou botão explícito

---

### FASE 5: WPPConnect (Prioridade Alta)

#### 5.1. Dashboard WhatsApp
- [ ] Status de conexão em destaque
- [ ] Contadores de mensagens
- [ ] Ações rápidas (Escanear QR, Desconectar)

#### 5.2. Interface de Mensagens
- [ ] Chat interface padrão (bolhas de mensagem)
- [ ] Input de texto em bottom
- [ ] Anexos (imagens, arquivos) em modal
- [ ] Emojis picker adaptado

#### 5.3. Histórico
- [ ] Listagem de conversas em cards
- [ ] Busca por contato/data
- [ ] Tap para abrir conversa
- [ ] Swipe para deletar/arquivar

---

### FASE 6: AxCell-OS Legado (Prioridade Alta)

#### 6.1. Desafio Especial
**O sistema AxCell-OS é em PHP/CodeIgniter antigo**

**Opções:**
1. **Wrapper Responsivo** (Short-term)
   - Aplicar CSS responsivo sobre HTML existente
   - Meta viewport correto
   - Breakpoints com media queries
   - Testar e corrigir layout

2. **Componentes Híbridos** (Medium-term)
   - Manter backend PHP
   - Substituir frontend com React/Vue
   - Usar WebComponents para compatibilidade

3. **Migração Gradual** (Long-term)
   - Converter módulos um por um
   - Usar Next.js para novo frontend
   - Manter PHP como API

#### 6.2. Implementação Recomendada
- [ ] **PRIMEIRO:** Adicionar viewport meta tag
- [ ] **SEGUNDO:** Aplicar CSS mobile responsivo
- [ ] **TERCEIRO:** Testes em dispositivos reais
- [ ] **QUARTO:** Ajustes conforme feedback
- [ ] **QUINTO:** Considerar migração futura

#### 6.3. Páginas AxCell-OS a Otimizar
- Login page
- Dashboard
- Relatórios
- Configurações
- Outras páginas conforme análise

---

## 🎨 Guia de Design Sistema Mobile

### 1. Tipografia
```
Títulos Principais: 24px - 28px
Subtítulos: 18px - 20px
Corpo de Texto: 14px - 16px
Labels/Captions: 12px - 14px

Line-height: 1.5x (mobile) - 1.6x (readability)
Fonte: Inter, Roboto, ou similar (sans-serif)
```

### 2. Espaçamento
```
Padding: 4px, 8px, 12px, 16px, 24px, 32px
Margin: 8px, 12px, 16px, 24px, 32px

Mobile: Usar 16px como base
Tablet: Aumentar para 20px
Desktop: Aumentar para 24px
```

### 3. Tamanho de Toque (Touch Targets)
```
Mínimo: 44px x 44px (Apple HIG)
Recomendado: 48px x 48px
Espaço entre: Mínimo 8px
```

### 4. Cores e Contraste
```
WCAG AA: Contraste mínimo 4.5:1 para texto
Cores: Usar 6-8 cores no máximo
Sistema: Light mode + Dark mode
```

### 5. Ícones
```
Tamanho: 24px (ações), 32px (destaque), 48px (FAB)
Peso: Regular (400) para 24px, Medium (500) para 32px+
Padding: 8px ao redor do ícone
```

### 6. Componentes Adaptativos

#### Botões
```
Mobile: Full width ou 100% quando possível
Altura: 44px (texto) até 60px (destaque)
Padding: 12px horizontal, 16px vertical
Variações: Primary, Secondary, Tertiary, Danger
```

#### Inputs
```
Altura: 44px (altura de toque confortável)
Padding: 12px horizontal
Placeholder: Descritivo
Tipo: Use input type correto (tel, email, number, etc)
```

#### Cards
```
Mobile: 1 coluna, full width com margin 16px
Tablet: 2 colunas com grid
Desktop: 3+ colunas
Padding interno: 16px
Border radius: 8px - 12px
```

#### Bottom Sheet/Modal
```
Altura: 70%-90% viewport em mobile
Draggable: Sim, com indicator no topo
Backdrop: Escuro, 60% opacidade
Ações: Botões grandes na base
```

---

## 📱 Breakpoints Recomendados (Tailwind)

```
320px  (xs) - iPhone SE, Samsung A10
480px  (sm) - iPhone 12 normal
640px  (md) - iPad mini landscape
768px  (md) - iPad portrait
1024px (lg) - Desktop
1280px (xl) - Desktop grande
```

### Media Queries por Módulo

```css
/* Exemplo: Transformar tabela em cards */

/* Mobile (default) */
table {
  display: block;
}
thead {
  display: none;
}
tr {
  display: block;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
}

/* Tablet+ */
@media (min-width: 768px) {
  table {
    display: table;
  }
  thead {
    display: table-header-group;
  }
  tr {
    display: table-row;
  }
}
```

---

## ⚡ Performance para Mobile

### 1. Otimização de Imagens
- [ ] Usar formatos modernos (WebP com fallback)
- [ ] Lazy loading (intersection observer)
- [ ] Responsive images (srcset)
- [ ] Compressão (Tinypng, Imagemin)
- [ ] Tamanho máximo: 100KB por imagem

### 2. Carregamento de Dados
- [ ] Pagination (não carregar tudo)
- [ ] Infinite scroll com threshold
- [ ] Cache com Service Workers
- [ ] Prefetch de dados relacionados
- [ ] Considerar IndexedDB para dados locais

### 3. Bundle Size
- [ ] Analizar bundle (webpack-bundle-analyzer)
- [ ] Remover dependências não usadas
- [ ] Tree-shaking de bibliotecas
- [ ] Code splitting por rota
- [ ] Manter bundle < 200KB gzipped

### 4. Tempo de Carregamento
- [ ] First Contentful Paint (FCP): < 1.8s
- [ ] Largest Contentful Paint (LCP): < 2.5s
- [ ] Cumulative Layout Shift (CLS): < 0.1
- [ ] Time to Interactive (TTI): < 3.5s

---

## ♿ Acessibilidade Mobile

### 1. Tela de Toque
- [ ] Área de toque mínima 44px
- [ ] Espaço entre elementos 8px
- [ ] Feedback visual em tap (hover/focus)
- [ ] Estados claros (ativo/inativo)

### 2. Navegação
- [ ] Ordem de tabulação lógica (tabindex)
- [ ] Skip links para conteúdo principal
- [ ] Breadcrumbs para navegação
- [ ] Back button sempre disponível

### 3. Leitura
- [ ] Contraste 4.5:1 para texto normal
- [ ] Contraste 3:1 para texto grande
- [ ] Fontes sem serifa, 14px+ tamanho
- [ ] Line-height 1.5+ para readability

### 4. Semântica HTML
- [ ] Usar header, main, nav, section
- [ ] Heading hierarchy (h1, h2, h3...)
- [ ] Alt text em imagens descritivos
- [ ] Labels em inputs
- [ ] ARIA quando necessário

### 5. Formulários
- [ ] Label explícita para cada input
- [ ] Teclado virtual apropriado (input type)
- [ ] Mensagens de erro claras
- [ ] Validação em tempo real
- [ ] Confirmação antes de submeter

---

## 📝 Checklist de Mobilização por Página

### Template de Checklist

```
Página: [Nome]
Módulo: [AppPortal/StockTech/AvAdmin/etc]
Prioridade: [Crítica/Alta/Média]
Status: [❌ Não Iniciado/🟡 Em Progresso/✅ Completo]

Layout Responsivo:
- [ ] Breakpoint 320px testado
- [ ] Breakpoint 480px testado
- [ ] Breakpoint 640px testado
- [ ] Breakpoint 1024px+ testado

Componentes:
- [ ] Botões >= 44px altura
- [ ] Inputs >= 44px altura
- [ ] Espaçamento adequado
- [ ] Ícones >= 24px

Touch Interactions:
- [ ] Ripple effects em botões
- [ ] Swipe gestures (se aplicável)
- [ ] Long-press (se aplicável)
- [ ] Feedback visual em tap

Performance:
- [ ] Imagens otimizadas
- [ ] Lazy loading implementado
- [ ] Bundle size < 200KB
- [ ] FCP < 1.8s

Acessibilidade:
- [ ] Contraste WCAG AA
- [ ] Labels em inputs
- [ ] Alt text em imagens
- [ ] Teclado navigation

Testes:
- [ ] iPhone 12/13
- [ ] Samsung Galaxy
- [ ] Tablet (iPad)
- [ ] Orientação portrait/landscape
- [ ] 3G/4G connection
- [ ] Dark mode

Notas:
[Observações adicionais]
```

---

## 🔧 Ferramenta e Tecnologias Recomendadas

### Frontend
- **Framework:** Next.js / React + Tailwind CSS
- **UI Components:** Radix UI (acessível)
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod
- **State:** Zustand (leve)
- **HTTP:** TanStack React Query
- **Temas:** next-themes (light/dark)

### Mobile-Specific
- **Responsivo:** Tailwind CSS (mobile-first)
- **Touch:** Hammerjs (gestures)
- **PWA:** Workbox (offline support)
- **Performance:** React.lazy + Suspense
- **Images:** Next.js Image component
- **Storage:** IndexedDB (local data)

### Testing
- **Unit:** Vitest
- **Integration:** Testing Library
- **E2E:** Playwright
- **Mobile Testing:** BrowserStack / Sauce Labs
- **Performance:** Lighthouse, WebPageTest

### Analytics
- **Real User Monitoring:** Sentry
- **Performance:** Web Vitals
- **User Analytics:** Plausible ou Fathom
- **Error Tracking:** Sentry / LogRocket

---

## 📅 Roadmap de Implementação

### Sprint 1: Fundação (Semana 1-2)
- [ ] Componentes base responsivos
- [ ] Sistema de grid/breakpoints
- [ ] Navegação mobile (bottom nav)
- [ ] Teste em 2-3 dispositivos

### Sprint 2: AppPortal (Semana 3-4)
- [ ] Login responsivo
- [ ] Registro adaptado
- [ ] Dashboard mobile
- [ ] Testes completos

### Sprint 3: StockTech (Semana 5-7)
- [ ] Dashboard adaptado
- [ ] Listagem de pedidos (cards)
- [ ] Criação de pedidos (wizard)
- [ ] PDV mobile (versão simplificada)

### Sprint 4: AvAdmin (Semana 8-9)
- [ ] Listagem de usuários (cards)
- [ ] Formulários adaptados
- [ ] Gráficos simplificados

### Sprint 5: WPPConnect + AxCell-OS (Semana 10-11)
- [ ] WhatsApp interface
- [ ] AxCell-OS wrapper responsivo

### Sprint 6: Otimização (Semana 12)
- [ ] Performance tuning
- [ ] Acessibilidade completa
- [ ] Testes finais
- [ ] Bugs e ajustes

---

## 🚀 Considerações Finais

### Princípios-Chave
1. **Mobile-First:** Design para mobile PRIMEIRO, depois expanda
2. **Simplicidade:** Menos é mais em mobile (remova clutter)
3. **Velocidade:** Performance é acessibilidade
4. **Toque:** Todas as ações devem ser com um dedo (sem hover)
5. **Contexto:** Usuário mobile está em movimento (ofline suport)
6. **Validação:** Teste em dispositivos REAIS, não só navegador

### Não Faça
- ❌ Código responsivo complexo
- ❌ Muitos elementos na tela
- ❌ Fonts muito pequenas
- ❌ Toque muito pequeno
- ❌ Menus aninhados profundos
- ❌ Vídeos auto-playing
- ❌ Pop-ups intrusivos
- ❌ Requisições simultâneas em excesso

### Sempre Faça
- ✅ Meta viewport correto
- ✅ Testar no dispositivo real
- ✅ Touch targets >= 44px
- ✅ Feedback visual claro
- ✅ Carregamento progressivo
- ✅ Offline graceful degradation
- ✅ Performance monitoring
- ✅ A/B testing de UX

---

## 📞 Suporte e Referências

### Documentação
- [MDN Web Docs - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Apple HIG - iOS](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design - Android](https://material.io/design)
- [Web.dev - Performance](https://web.dev/performance/)

### Ferramentas de Teste
- Google Chrome DevTools (F12)
- Mobile Simulator (Safari, Firefox)
- BrowserStack (dispositivos reais)
- Lighthouse CI/CD

### Métricas a Monitorar
- Core Web Vitals (LCP, FID, CLS)
- Performance Score (Lighthouse)
- Bounce Rate (Analytics)
- Error Rate (Sentry)
- User Sessions (Tempo médio)

---

**Desenvolvido para:** AvelarSys  
**Objetivo:** Transformar plataforma em mobile-first  
**Versão:** 1.0  
**Última Atualização:** Janeiro 2026

---

## 📌 Próximos Passos

1. **Revisar este documento** com toda a equipe
2. **Definir prioridades** com stakeholders
3. **Criar milestones** no projeto
4. **Iniciar Sprint 1** com fundação
5. **Testes contínuos** em dispositivos reais
6. **Feedback de usuários** beta
7. **Iteração** baseada em dados

**O sistema AvelarSys agora está pronto para ser mobilizado completamente!** 📱✨
