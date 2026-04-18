---
sidebar_position: 1
---

# Visão geral dos componentes

O AgentsKit inclui componentes headless que renderizam HTML semântico com atributos `data-ak-*`. Importe o tema padrão para estilização imediata, ou direcione os atributos com seu próprio CSS.

## Componentes disponíveis

| Componente | Finalidade |
|-----------|---------|
| `ChatContainer` | Layout de chat rolável com rolagem automática |
| `Message` | Balão de chat com suporte a streaming |
| `Markdown` | Renderizador de texto/markdown |
| `CodeBlock` | Código com destaque de sintaxe e botão copiar |
| `ToolCallView` | Exibição expansível de invocação de ferramenta |
| `ThinkingIndicator` | Estado animado de “pensando” / carregando |
| `InputBar` | Campo de texto com botão enviar |

## Filosofia headless

Os componentes renderizam HTML mínimo com atributos `data-ak-*`:

```html
<div data-ak-message data-ak-role="user" data-ak-status="complete">
  <div data-ak-content>Hello!</div>
</div>
```

Estilize com seletores de atributo:

```css
[data-ak-role="user"] [data-ak-content] {
  background: blue;
  color: white;
}
```

Ou importe o tema padrão:

```tsx
import '@agentskit/react/theme'
```
