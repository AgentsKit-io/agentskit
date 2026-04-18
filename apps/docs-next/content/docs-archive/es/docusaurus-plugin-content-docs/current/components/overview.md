---
sidebar_position: 1
---

# Descripción general de componentes

AgentsKit incluye componentes sin estilos que renderizan HTML semántico con atributos `data-ak-*`. Importa el tema por defecto para estilos al instante, o apunta a los atributos con tu propio CSS.

## Componentes disponibles

| Componente | Propósito |
|-----------|---------|
| `ChatContainer` | Diseño de chat con scroll y auto-scroll |
| `Message` | Burbuja de chat con soporte de streaming |
| `Markdown` | Renderizador de texto/markdown |
| `CodeBlock` | Código con resaltado de sintaxis y botón copiar |
| `ToolCallView` | Vista expandible de invocación de herramientas |
| `ThinkingIndicator` | Estado animado de pensamiento/carga |
| `InputBar` | Entrada de texto con botón enviar |

## Filosofía sin estilos

Los componentes renderizan HTML mínimo con atributos `data-ak-*`:

```html
<div data-ak-message data-ak-role="user" data-ak-status="complete">
  <div data-ak-content>Hello!</div>
</div>
```

Estila con selectores por atributo:

```css
[data-ak-role="user"] [data-ak-content] {
  background: blue;
  color: white;
}
```

O importa el tema por defecto:

```tsx
import '@agentskit/react/theme'
```
