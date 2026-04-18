---
sidebar_position: 3
---

# Theming

`@agentskit/react` inclui um tema padrão como arquivo CSS. Cada elemento usa atributos `data-ak-*` como seletores e propriedades CSS customizadas como tokens de design — sem nomes de classe, sem batalhas de especificidade.

## Ativar o tema padrão

```tsx
import '@agentskit/react/theme'
```

Um import e todos os elementos `data-ak-*` ficam estilizados. O tema inclui modo escuro embutido que ativa automaticamente via `prefers-color-scheme`.

## Forçar modo escuro ou claro

```html
<!-- force dark -->
<html data-theme="dark">

<!-- force light -->
<html data-theme="light">
```

Ou adicione a classe `.dark` a qualquer ancestral.

## Variáveis CSS

Substitua qualquer token reatribuindo sua propriedade customizada. Todos os tokens estão definidos em `:root`.

### Cores

```css
:root {
  --ak-color-bg: #ffffff;
  --ak-color-surface: #f9fafb;
  --ak-color-border: #e5e7eb;
  --ak-color-text: #111827;
  --ak-color-text-muted: #6b7280;

  /* Message bubbles */
  --ak-color-bubble-user: #2563eb;
  --ak-color-bubble-user-text: #ffffff;
  --ak-color-bubble-assistant: #f3f4f6;
  --ak-color-bubble-assistant-text: #111827;

  /* Input */
  --ak-color-input-bg: #ffffff;
  --ak-color-input-border: #d1d5db;
  --ak-color-input-focus: #2563eb;

  /* Send button */
  --ak-color-button: #2563eb;
  --ak-color-button-text: #ffffff;

  /* Code blocks */
  --ak-color-code-bg: #1f2937;
  --ak-color-code-text: #e5e7eb;

  /* Tool calls */
  --ak-color-tool-bg: #fef3c7;
  --ak-color-tool-border: #f59e0b;
}
```

### Tipografia e espaçamento

```css
:root {
  --ak-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ak-font-size: 14px;
  --ak-font-size-sm: 12px;
  --ak-font-size-lg: 16px;
  --ak-line-height: 1.5;

  --ak-radius: 8px;
  --ak-radius-lg: 12px;

  --ak-spacing-xs: 4px;
  --ak-spacing-sm: 8px;
  --ak-spacing-md: 12px;
  --ak-spacing-lg: 16px;
  --ak-spacing-xl: 24px;

  --ak-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --ak-transition: 150ms ease;
}
```

## Exemplo: tema de marca customizado

```css
/* my-theme.css */
:root {
  --ak-color-bubble-user: #7c3aed;
  --ak-color-bubble-user-text: #ffffff;
  --ak-color-input-focus: #7c3aed;
  --ak-color-button: #7c3aed;
  --ak-font-family: 'Inter', sans-serif;
  --ak-radius: 4px;
  --ak-radius-lg: 8px;
}
```

```tsx
import '@agentskit/react/theme'   // base tokens
import './my-theme.css'           // overrides
```

## Direcionar elementos com seletores `data-ak-*`

Todos os componentes emitem atributos `data-ak-*` estáveis. Use-os diretamente no CSS para sobrescritas estruturais:

```css
/* Wider assistant bubbles */
[data-ak-role="assistant"] {
  max-width: 90%;
}

/* Highlighted streaming message */
[data-ak-status="streaming"] [data-ak-content] {
  border-left: 3px solid var(--ak-color-button);
  padding-left: 12px;
}

/* Hide the copy button on mobile */
@media (max-width: 640px) {
  [data-ak-copy] {
    display: none;
  }
}
```

## Construir um tema do zero

Pule o import padrão e estilize os atributos `data-ak-*` você mesmo:

```tsx
// No '@agentskit/react/theme' import
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import './my-custom-theme.css'
```

```css
/* my-custom-theme.css — minimal example */
[data-ak-chat-container] {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

[data-ak-message][data-ak-role="user"] {
  align-self: flex-end;
  background: #7c3aed;
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
}

[data-ak-message][data-ak-role="assistant"] {
  align-self: flex-start;
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 12px;
}

[data-ak-input-bar] {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}
```

## Relacionados

- [Referência de componentes](./components.md)
- [@agentskit/react](./react.md)
