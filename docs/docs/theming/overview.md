---
sidebar_position: 1
---

# Theming

AgentKit components are headless by default. Import the optional theme for a polished chat UI.

## Default Theme

```tsx
import '@agentkit/react/theme'
```

Includes light and dark mode support via `prefers-color-scheme` or `data-theme` attribute.

## CSS Custom Properties

Override any token to customize the theme:

```css
:root {
  --ak-color-bubble-user: #10b981;
  --ak-color-button: #10b981;
  --ak-radius: 16px;
  --ak-font-family: 'Inter', sans-serif;
}
```

### Available Tokens

| Token | Default (light) | Description |
|-------|-----------------|-------------|
| `--ak-color-bg` | `#ffffff` | Page background |
| `--ak-color-surface` | `#f9fafb` | Surface/card background |
| `--ak-color-border` | `#e5e7eb` | Border color |
| `--ak-color-text` | `#111827` | Primary text |
| `--ak-color-text-muted` | `#6b7280` | Secondary text |
| `--ak-color-bubble-user` | `#2563eb` | User message bubble |
| `--ak-color-bubble-assistant` | `#f3f4f6` | Assistant message bubble |
| `--ak-color-button` | `#2563eb` | Button background |
| `--ak-font-family` | System font stack | Font family |
| `--ak-font-size` | `14px` | Base font size |
| `--ak-radius` | `8px` | Border radius |
| `--ak-spacing-*` | `4-24px` | Spacing scale (xs, sm, md, lg, xl) |

## Dark Mode

Automatic via `prefers-color-scheme`, or force it:

```html
<div data-theme="dark">
  <ChatContainer>...</ChatContainer>
</div>
```

## Fully Custom Styling

Skip the theme entirely and style using `data-ak-*` attribute selectors:

```css
[data-ak-chat-container] { /* your styles */ }
[data-ak-role="user"] [data-ak-content] { /* user bubble */ }
[data-ak-role="assistant"] [data-ak-content] { /* assistant bubble */ }
```
