---
sidebar_position: 3
---

# Temas

`@agentskit/react` incluye un tema por defecto como archivo CSS. Cada elemento usa atributos `data-ak-*` como selectores y propiedades personalizadas CSS como tokens de diseño — sin nombres de clase ni guerras de especificidad.

## Activar el tema por defecto

```tsx
import '@agentskit/react/theme'
```

Un solo import y todos los elementos `data-ak-*` quedan estilados. El tema incluye modo oscuro integrado que se activa automáticamente con `prefers-color-scheme`.

## Forzar modo oscuro u claro

```html
<!-- force dark -->
<html data-theme="dark">

<!-- force light -->
<html data-theme="light">
```

O añade la clase `.dark` a cualquier ancestro.

## Variables CSS

Sobrescribe cualquier token reasignando su propiedad personalizada. Todos los tokens están definidos en `:root`.

### Colores

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

### Tipografía y espaciado

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

## Ejemplo: tema de marca personalizado

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

## Apuntar a elementos con selectores `data-ak-*`

Todos los componentes emiten atributos `data-ak-*` estables. Úsalos directamente en CSS para ajustes estructurales:

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

## Construir un tema personalizado desde cero

Omite por completo el import por defecto y estila tú los atributos `data-ak-*`:

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

## Relacionado

- [Referencia de componentes](./components.md)
- [@agentskit/react](./react.md)
