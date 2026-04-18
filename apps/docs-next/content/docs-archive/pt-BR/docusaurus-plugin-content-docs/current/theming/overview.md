---
sidebar_position: 1
---

# Theming

Os componentes do AgentsKit são headless por padrão. Importe o tema opcional para uma UI de chat polida.

## Tema padrão

```tsx
import '@agentskit/react/theme'
```

Inclui suporte a modo claro e escuro via `prefers-color-scheme` ou atributo `data-theme`.

## Propriedades CSS customizadas

Substitua qualquer token para personalizar o tema:

```css
:root {
  --ak-color-bubble-user: #10b981;
  --ak-color-button: #10b981;
  --ak-radius: 16px;
  --ak-font-family: 'Inter', sans-serif;
}
```

### Tokens disponíveis

| Token | Padrão (claro) | Descrição |
|-------|-----------------|-------------|
| `--ak-color-bg` | `#ffffff` | Fundo da página |
| `--ak-color-surface` | `#f9fafb` | Fundo de superfície/card |
| `--ak-color-border` | `#e5e7eb` | Cor da borda |
| `--ak-color-text` | `#111827` | Texto principal |
| `--ak-color-text-muted` | `#6b7280` | Texto secundário |
| `--ak-color-bubble-user` | `#2563eb` | Balão de mensagem do usuário |
| `--ak-color-bubble-assistant` | `#f3f4f6` | Balão de mensagem do assistente |
| `--ak-color-button` | `#2563eb` | Fundo do botão |
| `--ak-font-family` | Pilha de fonte do sistema | Família da fonte |
| `--ak-font-size` | `14px` | Tamanho base da fonte |
| `--ak-radius` | `8px` | Raio da borda |
| `--ak-spacing-*` | `4-24px` | Escala de espaçamento (xs, sm, md, lg, xl) |

## Modo escuro

Automático via `prefers-color-scheme`, ou force:

```html
<div data-theme="dark">
  <ChatContainer>...</ChatContainer>
</div>
```

## Estilização totalmente customizada

Pule o tema e estilize com seletores de atributo `data-ak-*`:

```css
[data-ak-chat-container] { /* your styles */ }
[data-ak-role="user"] [data-ak-content] { /* user bubble */ }
[data-ak-role="assistant"] [data-ak-content] { /* assistant bubble */ }
```
