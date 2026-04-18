---
sidebar_position: 2
---

# @agentskit/ink

Interface de chat no terminal construída com [Ink](https://github.com/vadimdemedes/ink). Usa o mesmo controlador [`@agentskit/core`](../packages/core) de `@agentskit/react`, então a lógica do chat é idêntica — só o renderizador muda.

## Quando usar

- Chat estilo **CLI** ou compatível com SSH sem navegador.
- Você quer paridade com [`useChat`](../hooks/use-chat) do React, mas com renderização no terminal.

Use [`@agentskit/react`](./react) para web; use o [`CLI`](../infrastructure/cli) para chat no terminal sem código.

## Instalação

```bash
npm install @agentskit/ink @agentskit/core ink react
# optional: real AI providers
npm install @agentskit/adapters
```

## Hook

### `useChat`

API idêntica ao `useChat` de `@agentskit/react`. O mesmo objeto `ChatReturn` é retornado.

```tsx
import { useChat } from '@agentskit/ink'

const chat = useChat({
  adapter: myAdapter,
  systemPrompt: 'You are...',
})
```

Veja a [referência `useChat`](../hooks/use-chat.md) para o tipo de retorno completo.

## Exemplo completo (adaptador de demo — sem chave de API)

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

## Trocar para um provedor real

```tsx
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
```

## Navegação por teclado

`InputBar` usa o hook `useInput` do Ink. As seguintes teclas são tratadas automaticamente:

| Tecla | Ação |
|---|---|
| Qualquer caractere | Anexado à entrada |
| `Enter` | Envia mensagem |
| `Backspace` / `Delete` | Remove o último caractere |
| `Ctrl+C` | Sai (padrão Ink) |

A entrada fica desabilitada enquanto `chat.status === 'streaming'`.

## Cores no terminal

`Message` aplica uma cor fixa por papel usando a prop `color` do Ink:

| Papel | Cor |
|---|---|
| `assistant` | `cyan` |
| `user` | `green` |
| `system` | `yellow` |
| `tool` | `magenta` |

`ToolCallView` renderiza numa caixa arredondada com texto magenta. `ThinkingIndicator` renderiza em amarelo.

## Diferenças em relação a @agentskit/react

| Recurso | `@agentskit/react` | `@agentskit/ink` |
|---|---|---|
| Renderizador | DOM | Ink (terminal) |
| Tema / CSS | `data-ak-*` + variáveis CSS | Cores de terminal |
| Componente `Markdown` | Sim | Não |
| Componente `CodeBlock` | Sim | Não |
| Hook `useStream` | Sim | Não |
| Hook `useReactive` | Sim | Não |
| `InputBar` multilinha | Shift+Enter | Não (linha única) |

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| Raw mode / teclas | Garanta que stdout seja TTY; evite pipe ao depurar entrada. |
| Estouro de layout | Terminais estreitos cortam linhas longas; prefira system prompts mais curtos ou pager externo para dumps. |
| Hooks faltando | `useStream` / `useReactive` **não** vêm no Ink — padrões de import de `@agentskit/react` só se aplicam onde esses hooks existem. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/ink`) · [React](./react) · [Componentes](./components) · [@agentskit/core](../packages/core)
