---
sidebar_position: 1
---

# Temas

Los componentes de AgentsKit son sin estilo (headless) por defecto. Importa el tema opcional para una interfaz de chat pulida.

## Tema por defecto

```tsx
import '@agentskit/react/theme'
```

Incluye soporte de modo claro y oscuro mediante `prefers-color-scheme` o el atributo `data-theme`.

## Propiedades personalizadas CSS

Sobrescribe cualquier token para personalizar el tema:

```css
:root {
  --ak-color-bubble-user: #10b981;
  --ak-color-button: #10b981;
  --ak-radius: 16px;
  --ak-font-family: 'Inter', sans-serif;
}
```

### Tokens disponibles

| Token | Por defecto (claro) | Descripción |
|-------|---------------------|-------------|
| `--ak-color-bg` | `#ffffff` | Fondo de página |
| `--ak-color-surface` | `#f9fafb` | Fondo de superficie/tarjeta |
| `--ak-color-border` | `#e5e7eb` | Color del borde |
| `--ak-color-text` | `#111827` | Texto principal |
| `--ak-color-text-muted` | `#6b7280` | Texto secundario |
| `--ak-color-bubble-user` | `#2563eb` | Burbuja del usuario |
| `--ak-color-bubble-assistant` | `#f3f4f6` | Burbuja del asistente |
| `--ak-color-button` | `#2563eb` | Fondo del botón |
| `--ak-font-family` | Pila de fuentes del sistema | Familia tipográfica |
| `--ak-font-size` | `14px` | Tamaño base de fuente |
| `--ak-radius` | `8px` | Radio del borde |
| `--ak-spacing-*` | `4-24px` | Escala de espaciado (xs, sm, md, lg, xl) |

## Modo oscuro

Automático con `prefers-color-scheme`, o forzado así:

```html
<div data-theme="dark">
  <ChatContainer>...</ChatContainer>
</div>
```

## Estilo totalmente personalizado

Omite el tema y estila con selectores de atributos `data-ak-*`:

```css
[data-ak-chat-container] { /* tus estilos */ }
[data-ak-role="user"] [data-ak-content] { /* burbuja usuario */ }
[data-ak-role="assistant"] [data-ak-content] { /* burbuja asistente */ }
```
