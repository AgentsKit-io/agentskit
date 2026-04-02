---
sidebar_position: 1
---

# Theming

React Arrow components are headless by default. Import the optional theme for a polished chat UI.

## Default Theme

```tsx
import 'react-arrow/theme'
```

Includes light and dark mode support via `prefers-color-scheme` or `data-theme` attribute.

## CSS Custom Properties

Override any token to customize the theme:

```css
:root {
  --ra-color-bubble-user: #10b981;
  --ra-color-button: #10b981;
  --ra-radius: 16px;
  --ra-font-family: 'Inter', sans-serif;
}
```

### Available Tokens

| Token | Default (light) | Description |
|-------|-----------------|-------------|
| `--ra-color-bg` | `#ffffff` | Page background |
| `--ra-color-surface` | `#f9fafb` | Surface/card background |
| `--ra-color-border` | `#e5e7eb` | Border color |
| `--ra-color-text` | `#111827` | Primary text |
| `--ra-color-text-muted` | `#6b7280` | Secondary text |
| `--ra-color-bubble-user` | `#2563eb` | User message bubble |
| `--ra-color-bubble-assistant` | `#f3f4f6` | Assistant message bubble |
| `--ra-color-button` | `#2563eb` | Button background |
| `--ra-font-family` | System font stack | Font family |
| `--ra-font-size` | `14px` | Base font size |
| `--ra-radius` | `8px` | Border radius |
| `--ra-spacing-*` | `4-24px` | Spacing scale (xs, sm, md, lg, xl) |

## Dark Mode

Automatic via `prefers-color-scheme`, or force it:

```html
<div data-theme="dark">
  <ChatContainer>...</ChatContainer>
</div>
```

## Fully Custom Styling

Skip the theme entirely and style using `data-ra-*` attribute selectors:

```css
[data-ra-chat-container] { /* your styles */ }
[data-ra-role="user"] [data-ra-content] { /* user bubble */ }
[data-ra-role="assistant"] [data-ra-content] { /* assistant bubble */ }
```
