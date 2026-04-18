---
sidebar_position: 4
---

# Referencia de componentes

Todos los componentes sin estilo (headless) de `@agentskit/react` y `@agentskit/ink`. Los componentes emiten atributos `data-ak-*` (React) o usan primitivas de terminal de Ink (Ink) — no imponen un estilo visual concreto.

## Componentes de React

Importa desde `@agentskit/react`:

```tsx
import {
  ChatContainer,
  Message,
  InputBar,
  Markdown,
  CodeBlock,
  ToolCallView,
  ThinkingIndicator,
} from '@agentskit/react'
```

---

### `ChatContainer`

Contenedor con scroll. Conecta un `MutationObserver` y hace scroll automático al fondo cuando cambian los hijos.

```tsx
<ChatContainer className="my-chat">
  {/* messages, indicators */}
</ChatContainer>
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `children` | `ReactNode` | — | Obligatorio. Lista de mensajes y otro contenido. |
| `className` | `string` | — | Clase CSS adicional. |

Emite: `data-ak-chat-container`

---

### `Message`

Renderiza un único objeto `Message` de `chat.messages`.

```tsx
<Message
  message={msg}
  avatar={<img src={userAvatar} alt="User" />}
  actions={<button onClick={() => copy(msg.content)}>Copy</button>}
/>
```

| Prop | Tipo | Descripción |
|---|---|---|
| `message` | `MessageType` | Obligatorio. Mensaje a mostrar. |
| `avatar` | `ReactNode` | Avatar opcional junto a la burbuja. |
| `actions` | `ReactNode` | Fila de acciones opcional bajo el contenido. |

Emite: `data-ak-message`, `data-ak-role`, `data-ak-status`, `data-ak-content`, `data-ak-avatar`, `data-ak-actions`

---

### `InputBar`

Textarea + botón de envío conectados a un objeto `ChatReturn`. Envía con `Enter`, inserta salto de línea con `Shift+Enter`.

```tsx
<InputBar
  chat={chat}
  placeholder="Ask anything..."
  disabled={false}
/>
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `chat` | `ChatReturn` | — | Obligatorio. Valor devuelto por `useChat`. |
| `placeholder` | `string` | `'Type a message...'` | Placeholder del textarea. |
| `disabled` | `boolean` | `false` | Desactiva entrada y botón. |

Emite: `data-ak-input-bar`, `data-ak-input`, `data-ak-send`

---

### `Markdown`

Envoltorio ligero para contenido Markdown. Añade tu propio renderizador (p. ej. `react-markdown`) dentro o sustituye el componente por completo.

```tsx
<Markdown content={msg.content} streaming={msg.status === 'streaming'} />
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `content` | `string` | — | Obligatorio. Cadena Markdown a mostrar. |
| `streaming` | `boolean` | `false` | Añade `data-ak-streaming="true"` mientras hay streaming. |

Emite: `data-ak-markdown`, `data-ak-streaming`

---

### `CodeBlock`

Muestra un fragmento de código con botón de copiar opcional.

```tsx
<CodeBlock code="npm install @agentskit/react" language="bash" copyable />
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `code` | `string` | — | Obligatorio. Código fuente a mostrar. |
| `language` | `string` | — | Pista de lenguaje (p. ej. `'tsx'`, `'bash'`). |
| `copyable` | `boolean` | `false` | Muestra un botón Copiar que escribe en el portapapeles. |

Emite: `data-ak-code-block`, `data-ak-language`, `data-ak-copy`

---

### `ToolCallView`

Vista expandible para una sola llamada a herramienta. Al hacer clic en el nombre de la herramienta se alterna la visibilidad de argumentos y resultado.

```tsx
{msg.toolCalls?.map(tc => (
  <ToolCallView key={tc.id} toolCall={tc} />
))}
```

| Prop | Tipo | Descripción |
|---|---|---|
| `toolCall` | `ToolCall` | Obligatorio. Objeto de llamada a herramienta de `@agentskit/core`. |

Emite: `data-ak-tool-call`, `data-ak-tool-status`, `data-ak-tool-toggle`, `data-ak-tool-details`, `data-ak-tool-args`, `data-ak-tool-result`

---

### `ThinkingIndicator`

Tres puntos animados con una etiqueta. No renderiza nada cuando `visible` es `false`.

```tsx
<ThinkingIndicator visible={chat.status === 'streaming'} label="Thinking..." />
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `visible` | `boolean` | — | Obligatorio. Mostrar u ocultar el indicador. |
| `label` | `string` | `'Thinking...'` | Etiqueta accesible junto a los puntos. |

Emite: `data-ak-thinking`, `data-ak-thinking-dots`, `data-ak-thinking-label`

---

## Componentes de Ink

Importa desde `@agentskit/ink`:

```tsx
import {
  ChatContainer,
  Message,
  InputBar,
  ToolCallView,
  ThinkingIndicator,
} from '@agentskit/ink'
```

---

### `ChatContainer` (Ink)

Envuelve los hijos en un `<Box flexDirection="column" gap={1}>` de Ink.

```tsx
<ChatContainer>
  {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
</ChatContainer>
```

| Prop | Tipo | Descripción |
|---|---|---|
| `children` | `ReactNode` | Obligatorio. |

---

### `Message` (Ink)

Renderiza la etiqueta del rol con un color de terminal según el rol y, debajo, el contenido del mensaje.

```tsx
<Message message={msg} />
```

| Prop | Tipo | Descripción |
|---|---|---|
| `message` | `MessageType` | Obligatorio. |

Colores por rol: `assistant` → cyan, `user` → green, `system` → yellow, `tool` → magenta.

---

### `InputBar` (Ink)

Captura el teclado con `useInput` de Ink. Envía con `Enter`, borra con `Backspace`/`Delete`. Deshabilitado mientras hay streaming.

```tsx
<InputBar chat={chat} placeholder="Type and press Enter..." />
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `chat` | `ChatReturn` | — | Obligatorio. |
| `placeholder` | `string` | `'Type a message...'` | Se muestra encima de la línea de entrada. |
| `disabled` | `boolean` | `false` | Impide la entrada. |

---

### `ToolCallView` (Ink)

Dibuja un recuadro con borde redondeado con el nombre de la herramienta, el estado y, opcionalmente, los argumentos y el resultado.

```tsx
<ToolCallView toolCall={tc} expanded />
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `toolCall` | `ToolCall` | — | Obligatorio. |
| `expanded` | `boolean` | `false` | Muestra args y resultado en línea. |

---

### `ThinkingIndicator` (Ink)

Texto amarillo en una sola línea. No renderiza nada cuando `visible` es `false`.

```tsx
<ThinkingIndicator visible={chat.status === 'streaming'} label="Thinking..." />
```

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `visible` | `boolean` | — | Obligatorio. |
| `label` | `string` | `'Thinking...'` | Texto a mostrar. |

---

## Disponibilidad de componentes

| Componente | `@agentskit/react` | `@agentskit/ink` |
|---|---|---|
| `ChatContainer` | Sí | Sí |
| `Message` | Sí | Sí |
| `InputBar` | Sí | Sí |
| `ToolCallView` | Sí | Sí |
| `ThinkingIndicator` | Sí | Sí |
| `Markdown` | Sí | No |
| `CodeBlock` | Sí | No |

## Relacionado

- [@agentskit/react](./react.md)
- [@agentskit/ink](./ink.md)
- [Temas](./theming.md)
