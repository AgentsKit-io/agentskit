---
sidebar_position: 4
---

# Referência de componentes

Todos os componentes headless em `@agentskit/react` e `@agentskit/ink`. Os componentes emitem atributos `data-ak-*` (React) ou usam primitivas de terminal do Ink (Ink) — não impõem estilo visual.

## Componentes React

Importe de `@agentskit/react`:

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

Wrapper rolável. Anexa um `MutationObserver` e rola automaticamente para o fim quando os filhos mudam.

```tsx
<ChatContainer className="my-chat">
  {/* messages, indicators */}
</ChatContainer>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `children` | `ReactNode` | — | Obrigatório. Lista de mensagens e outro conteúdo. |
| `className` | `string` | — | Classe CSS extra. |

Emite: `data-ak-chat-container`

---

### `Message`

Renderiza um único objeto `Message` de `chat.messages`.

```tsx
<Message
  message={msg}
  avatar={<img src={userAvatar} alt="User" />}
  actions={<button onClick={() => copy(msg.content)}>Copy</button>}
/>
```

| Prop | Tipo | Descrição |
|---|---|---|
| `message` | `MessageType` | Obrigatório. A mensagem a renderizar. |
| `avatar` | `ReactNode` | Avatar opcional ao lado do balão. |
| `actions` | `ReactNode` | Linha de ações opcional abaixo do conteúdo. |

Emite: `data-ak-message`, `data-ak-role`, `data-ak-status`, `data-ak-content`, `data-ak-avatar`, `data-ak-actions`

---

### `InputBar`

Textarea + botão enviar ligados a um objeto `ChatReturn`. Envia com `Enter`, insere nova linha com `Shift+Enter`.

```tsx
<InputBar
  chat={chat}
  placeholder="Ask anything..."
  disabled={false}
/>
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `chat` | `ChatReturn` | — | Obrigatório. Valor retornado por `useChat`. |
| `placeholder` | `string` | `'Type a message...'` | Placeholder da textarea. |
| `disabled` | `boolean` | `false` | Desabilita entrada e botão. |

Emite: `data-ak-input-bar`, `data-ak-input`, `data-ak-send`

---

### `Markdown`

Wrapper leve para conteúdo markdown. Adicione seu próprio renderizador (por exemplo `react-markdown`) dentro ou substitua o componente inteiro.

```tsx
<Markdown content={msg.content} streaming={msg.status === 'streaming'} />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `content` | `string` | — | Obrigatório. String markdown a exibir. |
| `streaming` | `boolean` | `false` | Adiciona `data-ak-streaming="true"` durante o streaming. |

Emite: `data-ak-markdown`, `data-ak-streaming`

---

### `CodeBlock`

Renderiza um trecho de código com botão copiar opcional.

```tsx
<CodeBlock code="npm install @agentskit/react" language="bash" copyable />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `code` | `string` | — | Obrigatório. Código-fonte a exibir. |
| `language` | `string` | — | Dica de linguagem (por exemplo `'tsx'`, `'bash'`). |
| `copyable` | `boolean` | `false` | Mostra botão Copiar que grava na área de transferência. |

Emite: `data-ak-code-block`, `data-ak-language`, `data-ak-copy`

---

### `ToolCallView`

Visão expansível para uma única chamada de ferramenta. Clicar no nome da ferramenta alterna visibilidade de args e resultado.

```tsx
{msg.toolCalls?.map(tc => (
  <ToolCallView key={tc.id} toolCall={tc} />
))}
```

| Prop | Tipo | Descrição |
|---|---|---|
| `toolCall` | `ToolCall` | Obrigatório. Objeto de chamada de ferramenta de `@agentskit/core`. |

Emite: `data-ak-tool-call`, `data-ak-tool-status`, `data-ak-tool-toggle`, `data-ak-tool-details`, `data-ak-tool-args`, `data-ak-tool-result`

---

### `ThinkingIndicator`

Três pontos animados com rótulo. Não renderiza nada quando `visible` é `false`.

```tsx
<ThinkingIndicator visible={chat.status === 'streaming'} label="Thinking..." />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `visible` | `boolean` | — | Obrigatório. Mostra ou oculta o indicador. |
| `label` | `string` | `'Thinking...'` | Rótulo acessível ao lado dos pontos. |

Emite: `data-ak-thinking`, `data-ak-thinking-dots`, `data-ak-thinking-label`

---

## Componentes Ink

Importe de `@agentskit/ink`:

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

Envolve filhos num `<Box flexDirection="column" gap={1}>` do Ink.

```tsx
<ChatContainer>
  {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
</ChatContainer>
```

| Prop | Tipo | Descrição |
|---|---|---|
| `children` | `ReactNode` | Obrigatório. |

---

### `Message` (Ink)

Renderiza o rótulo do papel numa cor de terminal específica ao papel, depois o conteúdo abaixo.

```tsx
<Message message={msg} />
```

| Prop | Tipo | Descrição |
|---|---|---|
| `message` | `MessageType` | Obrigatório. |

Cores por papel: `assistant` → cyan, `user` → green, `system` → yellow, `tool` → magenta.

---

### `InputBar` (Ink)

Captura entrada de teclado via `useInput` do Ink. Envia com `Enter`, apaga com `Backspace`/`Delete`. Desabilitado durante streaming.

```tsx
<InputBar chat={chat} placeholder="Type and press Enter..." />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `chat` | `ChatReturn` | — | Obrigatório. |
| `placeholder` | `string` | `'Type a message...'` | Mostrado acima da linha de entrada. |
| `disabled` | `boolean` | `false` | Impede entrada. |

---

### `ToolCallView` (Ink)

Renderiza caixa com borda arredondada com nome da ferramenta, status e opcionalmente args e resultado.

```tsx
<ToolCallView toolCall={tc} expanded />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `toolCall` | `ToolCall` | — | Obrigatório. |
| `expanded` | `boolean` | `false` | Mostra args e resultado inline. |

---

### `ThinkingIndicator` (Ink)

Texto amarelo em linha única. Não renderiza nada quando `visible` é `false`.

```tsx
<ThinkingIndicator visible={chat.status === 'streaming'} label="Thinking..." />
```

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `visible` | `boolean` | — | Obrigatório. |
| `label` | `string` | `'Thinking...'` | Texto a exibir. |

---

## Disponibilidade de componentes

| Componente | `@agentskit/react` | `@agentskit/ink` |
|---|---|---|
| `ChatContainer` | Sim | Sim |
| `Message` | Sim | Sim |
| `InputBar` | Sim | Sim |
| `ToolCallView` | Sim | Sim |
| `ThinkingIndicator` | Sim | Sim |
| `Markdown` | Sim | Não |
| `CodeBlock` | Sim | Não |

## Relacionados

- [@agentskit/react](./react.md)
- [@agentskit/ink](./ink.md)
- [Theming](./theming.md)
