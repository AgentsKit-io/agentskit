---
sidebar_position: 2
---

# @agentskit/ink

Interfaz de chat para terminal construida con [Ink](https://github.com/vadimdemedes/ink). Usa el mismo controlador [`@agentskit/core`](../packages/core) que `@agentskit/react`, así que la lógica del chat es idéntica — solo cambia el renderizador.

## Cuándo usarlo

- Chat estilo **CLI** o apto para SSH sin navegador.
- Quieres paridad con [`useChat`](../hooks/use-chat) de React pero con renderizado en terminal.

Usa [`@agentskit/react`](./react) para web; usa el [`CLI`](../infrastructure/cli) para chat en terminal sin código.

## Instalación

```bash
npm install @agentskit/ink @agentskit/core ink react
# optional: real AI providers
npm install @agentskit/adapters
```

## Hook

### `useChat`

API idéntica a `useChat` de `@agentskit/react`. Se devuelve el mismo objeto `ChatReturn`.

```tsx
import { useChat } from '@agentskit/ink'

const chat = useChat({
  adapter: myAdapter,
  systemPrompt: 'You are...',
})
```

Consulta la [referencia de `useChat`](../hooks/use-chat.md) para el tipo de retorno completo.

## Ejemplo completo (adaptador demo — sin API key)

```tsx
import React from 'react'
import { render, Box, Text } from 'ink'
import {
  ChatContainer,
  Message,
  InputBar,
  ThinkingIndicator,
  useChat,
} from '@agentskit/ink'
import type { AdapterFactory } from '@agentskit/ink'

function createDemoAdapter(): AdapterFactory {
  return {
    createSource: ({ messages }) => {
      let cancelled = false
      return {
        stream: async function* () {
          const last = [...messages].reverse().find(m => m.role === 'user')
          const reply = `You said: "${last?.content ?? ''}". This is a demo response.`
          for (const chunk of reply.match(/.{1,20}/g) ?? []) {
            if (cancelled) return
            await new Promise(r => setTimeout(r, 45))
            yield { type: 'text' as const, content: chunk }
          }
          yield { type: 'done' as const }
        },
        abort: () => { cancelled = true },
      }
    },
  }
}

function App() {
  const chat = useChat({
    adapter: createDemoAdapter(),
    systemPrompt: 'You are a helpful terminal assistant.',
  })

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">AgentsKit Terminal Chat</Text>
      <ChatContainer>
        {chat.messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </ChatContainer>
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} placeholder="Type and press Enter..." />
    </Box>
  )
}

render(<App />)
```

## Cambiar a un proveedor real

```tsx
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
```

## Navegación por teclado

`InputBar` usa el hook `useInput` de Ink. Se gestionan automáticamente estas teclas:

| Tecla | Acción |
|---|---|
| Cualquier carácter | Se añade a la entrada |
| `Enter` | Enviar mensaje |
| `Backspace` / `Delete` | Borrar el último carácter |
| `Ctrl+C` | Salir (comportamiento por defecto de Ink) |

La entrada queda deshabilitada mientras `chat.status === 'streaming'`.

## Colores en terminal

`Message` aplica un color fijo por rol usando la prop `color` de Ink:

| Rol | Color |
|---|---|
| `assistant` | `cyan` |
| `user` | `green` |
| `system` | `yellow` |
| `tool` | `magenta` |

`ToolCallView` se dibuja en un recuadro redondeado con texto magenta. `ThinkingIndicator` se muestra en amarillo.

## Diferencias respecto a @agentskit/react

| Característica | `@agentskit/react` | `@agentskit/ink` |
|---|---|---|
| Renderizador | DOM | Ink (terminal) |
| Tema / CSS | `data-ak-*` + variables CSS | Colores de terminal |
| Componente `Markdown` | Sí | No |
| Componente `CodeBlock` | Sí | No |
| Hook `useStream` | Sí | No |
| Hook `useReactive` | Sí | No |
| `InputBar` multilínea | Shift+Enter | No (una sola línea) |

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| Modo raw / problemas con teclas | Asegúrate de que stdout sea una TTY; evita tuberías al depurar la entrada. |
| Desbordamiento de layout | Terminales estrechas recortan líneas largas; usa system prompts más cortos o un paginador externo para volcados. |
| Faltan hooks | `useStream` / `useReactive` **no** van en Ink — los patrones de importación de `@agentskit/react` solo aplican donde existan esos hooks. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/ink`) · [React](./react) · [Componentes](./components) · [@agentskit/core](../packages/core)
