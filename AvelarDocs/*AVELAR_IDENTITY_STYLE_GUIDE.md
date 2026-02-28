# Avelar Company - Identidade Visual & Guia de Estilo (UX/UI)

Este documento define as diretrizes de design, estética e experiência do usuário (UX) para todo o ecossistema **Avelar Company**. Ele serve como a "Bíblia de Estilo" para garantir que todos os módulos e portais mantenham uma identidade premium, elegante e funcional.

---

## 1. O Propósito e a Identidade
A Avelar Company busca transmitir **autoridade, confiança e modernidade**. Nossa identidade é focada no mercado B2B, mas com a simplicidade e o refinamento de um produto de consumo premium (Apple-like).

### Pilares da Identidade:
*   **Elegância:** Menos é mais. Espaçamentos generosos e foco no conteúdo.
*   **Consistência:** A mesma experiência, seja no computador ou no smartphone.
*   **Familiaridade:** Uso de elementos que o usuário já conhece (como emojis nativos e gestos de interface móvel).

---

## 2. A "Fórmula" de Design (Inspirada na Apple)
Nossa interface segue a estética dos sistemas iOS/macOS, adaptada para o DNA da Avelar.

### Características Físicas:
*   **Cantos Arredondados (Squircles):** Não usamos cantos retos. O padrão para cards e botões principais é `rounded-[2.5rem]` (extremanente arredondado).
*   **Glassmorphism:** Uso de transparências com desfoque de fundo (`backdrop-blur`). Isso cria uma hierarquia visual de "camadas".
*   **Minimalismo:** Interfaces limpas, sem bordas pesadas. Usamos apenas uma linha sutil de `1px` com transparência (`white/10` ou `black/10`).

---

## 3. Paleta de Cores (Monochrome Luxury)
A paleta oficial da Avelar Company é baseada no contraste máximo e na sofisticação do monocromático.

### Tema Escuro (Dark Mode - Padrão Avelar)
*   **Fundo Principal:** `#000000` (Preto Puro para telas OLED).
*   **Fundo de Cards/Elementos:** `#09090b` (Cinza quase preto).
*   **Texto Principal:** `#fafafa` (Branco gelo).
*   **Texto Secundário/Muted:** `#a1a1aa` (Cinza médio).
*   **Destaque (Accent):** `#ffffff` (Branco puro).

### Tema Claro (Light Mode)
*   **Fundo Principal:** `#ffffff` (Branco puro).
*   **Fundo de Cards/Elementos:** `#f4f4f5` (Cinza muito claro).
*   **Texto Principal:** `#09090b` (Preto profundo).
*   **Texto Secundário/Muted:** `#71717a` (Cinza escuro).
*   **Destaque (Accent):** `#18181b` (Preto suave).

---

## 4. Tipografia
*   **Fonte Principal:** `Inter` (Sans-serif).
*   **Características:** Pesos variando de `300` (Light) para textos explicativos a `900` (Black) para títulos e marcas.
*   **Espaçamento entre letras:** `tracking-tighter` para títulos grandes, transmitindo um visual de revista de luxo.

---

## 5. Elementos de Interface (UI)

### Emojis como Ícones
Decidimos manter o uso de **Emojis Nativos** do sistema.
*   **Por que?** Geram familiaridade imediata, adaptando-se visualmente ao dispositivo do usuário (iPhone, Android, Windows).
*   **Uso:** Representação de módulos e ações rápidas.

### Navegação (Segmented Control)
A navegação por abas deve parecer um controle físico. Uma pílula arredondada que flutua sobre o fundo, com o item ativo em alto contraste.

### Header (Cabeçalho)
*   **Posicionamento:** Header funcional movido para o **rodapé** em visualização desktop/mobile unificada, centralizando o controle de sessão e identidade no final da experiência de navegação.
*   **Esquerda:** Logo "Avelar System" em negrito/black + Ícone do prédio (🏢).
*   **Direita:** Controle de Logout Deslizante (Slide to Unlock invertido) + Avatar do usuário.

### Footer (Rodapé)
*   O rodapé atua como o **novo cabeçalho funcional**, contendo a identificação do sistema e o slider de logout.
*   Abaixo dele, informações de copyright e selos de segurança.

---

## 6. Experiência do Usuário (UX)
1.  **Micro-interações:** Toda transição deve durar entre `300ms` e `500ms` com efeito `ease-out`.
2.  **Feedback Visual:** Botões e cards devem ter efeito de `hover:scale-[1.02]` para indicar interatividade.
3.  **Respiro (Whitespace):** Nunca apertar elementos. Se estiver na dúvida, adicione mais `padding`.

---

## 7. Stack Tecnológica de Design

Para garantir que esta identidade seja escalável para qualquer sistema futuro da Avelar Company (Admin, StockTech, etc.), utilizamos as seguintes tecnologias:

*   **Framework:** [Next.js](https://nextjs.org/) (React) - Para uma base sólida e rápida.
*   **CSS Engine:** [Tailwind CSS](https://tailwindcss.com/) - Fundamental para manter a consistência através de classes utilitárias e facilidade de customização.
*   **Tema:** [Tailwind Dark Mode (class-based)](https://tailwindcss.com/docs/dark-mode) - Configurado como `class` e definido como padrão (`className="dark"` no `layout.tsx`).
*   **Ícones/Símbolos:** [Native Emojis](https://emojipedia.org/) - Escolhidos pela familiaridade e zero custo de carregamento (posteriormente podem ser integrados SVGs customizados seguindo a mesma semântica).
*   **Fontes:** [Inter (via Google Fonts/Next Font)](https://fonts.google.com/specimen/Inter) - Pela legibilidade e visual moderno.

---

## 8. Guia de Implementação Técnica (Para Desenvolvedores e IAs)

Este guia deve ser seguido rigorosamente para manter a integridade da marca Avelar em qualquer nova página ou sistema.

### Passo 1: Configuração do Core (Tailwind)

1.  **tailwind.config.js:** Adicione `darkMode: 'class'`.
2.  **layout.tsx:** Adicione `className="dark"` à tag `<html>` para forçar o tema escuro como padrão.
3.  **globals.css:** Utilize as variáveis abaixo.

Abaixo, o código completo do `globals.css` que deve ser usado como base. Ele inclui as definições de tema e componentes utilitários de design:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  /* Tema Claro - Avelar High Contrast White */
  --background: #ffffff;
  --foreground: #09090b;
  --card: rgba(244, 244, 245, 0.8);
  --card-border: rgba(0, 0, 0, 0.08);
  --accent: #18181b;
  --muted: #71717a;
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.4);
  --selection: rgba(0, 0, 0, 0.1);
}

.dark {
  /* Tema Escuro - Avelar OLED Black */
  --background: #000000;
  --foreground: #fafafa;
  --card: rgba(9, 9, 11, 0.7);
  --card-border: rgba(255, 255, 255, 0.1);
  --accent: #ffffff;
  --muted: #a1a1aa;
  --glass-bg: rgba(0, 0, 0, 0.5);
  --glass-border: rgba(255, 255, 255, 0.15);
  --selection: rgba(255, 255, 255, 0.2);
}

@layer base {
  * {
    @apply border-[var(--card-border)] selection:bg-[var(--selection)];
    /* Ocultar barra de rolagem globalmente (Estilo App Nativo) */
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  /* Ocultar barra de rolagem para Chrome, Safari e Opera */
  *::-webkit-scrollbar {
    display: none;
  }

  body {
    @apply bg-[var(--background)] text-[var(--foreground)] antialiased;
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
}

@layer components {
  /* Efeito Vidro Apple (Glassmorphism) */
  .glass {
    @apply backdrop-blur-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-2xl;
  }

  /* Card Assinatura Avelar */
  .avelar-card {
    @apply glass rounded-[2.5rem] p-8 transition-all duration-700 
           hover:scale-[1.02] hover:shadow-primary-500/5;
  }

  /* Botões Master - Estilo iPhone */
  .btn-avelar {
    @apply px-8 py-4 rounded-2xl font-bold uppercase tracking-tighter transition-all duration-300 
           flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none;
  }

  /* Botão Principal (Preto no Claro, Branco no Escuro) */
  .btn-primary {
    @apply btn-avelar bg-[var(--accent)] text-[var(--background)] 
           hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)];
  }

  /* Botão de Vidro Transparente */
  .btn-glass {
    @apply btn-avelar glass text-[var(--foreground)] hover:bg-[var(--glass-bg)];
  }

  /* Botão de Alerta/Sair */
  .btn-danger {
    @apply btn-avelar bg-red-500/10 text-red-500 border border-red-500/20 
           hover:bg-red-500 hover:text-white hover:shadow-[0_10px_30px_rgba(239,68,68,0.2)];
  }

  /* Navegação Segmented Control iOS */
  .nav-pill {
    @apply flex gap-1 p-1.5 bg-[var(--card)] rounded-[2rem] border border-[var(--card-border)] backdrop-blur-md shadow-inner;
  }

  .nav-pill-item {
    @apply px-6 py-2.5 rounded-[1.5rem] text-sm font-bold transition-all duration-500;
  }

  .nav-pill-item-active {
    @apply bg-black/10 dark:bg-white/10 text-[var(--foreground)] shadow-lg scale-100 backdrop-blur-sm;
  }

  .nav-pill-item-inactive {
    @apply text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5 scale-95;
  }
}

/* Blobs de Fundo Animados */
.avelar-blob {
  @apply fixed rounded-full blur-[120px] animate-pulse opacity-20 pointer-events-none z-[-1];
}
```

### Passo 2: Estrutura de Camadas (Z-Index & Blur)
A hierarquia visual da Avelar Company é baseada em profundidade:
1.  **Camada 0 (Fundo):** `bg-[var(--background)]` com blobs animados.
2.  **Camada 1 (Cards):** `bg-[var(--card)]` com `backdrop-blur-md` e borda `1px`.
3.  **Camada 2 (Sobreposição/Modais):** `bg-[var(--background)]/80` com `backdrop-blur-xl`.

### Passo 3: O "Toque Apple" (The Squircle Factor)
Para qualquer container principal, utilize:
*   `rounded-[2.5rem]` para Desktop.
*   `rounded-[2rem]` para Mobile.
*   `transition-all duration-500 ease-out` para qualquer estado de hover.

### Passo 4: Escalabilidade para Novos Sistemas
Ao criar um novo sistema (ex: `AvAdmin` ou `StockTech`):
1.  Importe o `AVELAR_IDENTITY_STYLE_GUIDE.md` para o contexto da IA.
2.  Copie o arquivo `globals.css` base.
3.  Configure `darkMode: 'class'` e adicione `className="dark"` ao `html`.
4.  Mantenha o Header e Footer conforme os padrões da **Fase 3** e **Fase 6** do Plano de Implementação.

---

## 9. Plano de Implementação (Passo a Passo)

Para transformar o portal atual na Identidade Avelar Company, seguiremos este cronograma técnico:

### Fase 1: Fundação e Variáveis (CSS)
*   **Ação:** Atualizar o arquivo `src/app/globals.css`.
*   **Tarefa:** Implementar as variáveis de cores `:root` e `.dark` conforme a seção 3 deste guia.
*   **Código Base:**
    ```css
    :root {
      --background: #ffffff;
      /* ... (Definições Light) */
    }
    .dark {
      --background: #000000;
      /* ... (Definições Dark - Padrão via layout.tsx) */
    }
    ```

### Fase 2: Atmosfera e Fundo (Layout)
*   **Ação:** Editar `src/app/layout.tsx` ou o container principal do Dashboard.
*   **Tarefa:** Adicionar os "Blobs" de fundo com desfoque extremo (`blur-[120px]`) e animação de pulsação suave para criar profundidade.

### Fase 3: Cabeçalho Premium (Header)
*   **Ação:** Refatorar o componente de Header.
*   **Tarefa:** 
    1.  Aplicar `sticky top-0` com `backdrop-blur-xl`.
    2.  Estilizar o logo com `font-black` e `tracking-tighter`.
    3.  Transformar o seletor de perfil em um elemento estilo "pill" (pílula) com bordas `rounded-full`.

### Fase 4: Controles de Navegação (Tabs)
*   **Ação:** Atualizar o seletor de abas do Dashboard.
*   **Tarefa:** Criar o container estilo "Segmented Control" do iOS.
    *   Fundo: `bg-[var(--card)]`
    *   Botão Ativo: `bg-[var(--accent)] text-[var(--background)]` com `shadow-lg`.
    *   Botões Inativos: `text-[var(--muted)] hover:text-[var(--foreground)]`.

### Fase 5: Cards de Módulos (Grid)
*   **Ação:** Estilizar o Grid de módulos.
*   **Tarefa:** 
    1.  Aplicar `rounded-[2.5rem]` em todos os cards.
    2.  Adicionar efeito de `hover:-translate-y-2` e `hover:scale-[1.02]`.
    3.  Manter os emojis grandes e centralizados para reconhecimento rápido.

### Fase 6: Finalização e Logout
*   **Ação:** Ajustar o rodapé.
*   **Tarefa:** Implementar o botão de Sair no final da página com estilo de "vidro de alto contraste" (Preto no tema claro, Branco no tema escuro), garantindo que seja o elemento final de ação.

---

> "O design não é apenas o que parece e o que se sente. O design é como funciona." - Inspirado na filosofia Apple para a Avelar Company.
