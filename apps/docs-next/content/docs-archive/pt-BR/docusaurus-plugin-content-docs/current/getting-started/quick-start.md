---
sidebar_position: 2
---

# Início rápido

Monte um chat com IA funcional em menos de 10 linhas.

## Chat básico

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

function App() {
  const chat = useChat({
    adapter: anthropic({ apiKey: 'your-key', model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

## Experimente os exemplos oficiais

- App React: `apps/example-react`
- App Ink: `apps/example-ink`
- CLI: `node packages/cli/dist/bin.js chat --provider demo`

## O que está acontecendo?

1. **`useChat`** cria uma sessão de chat ligada a um adaptador de IA
2. **`ChatContainer`** fornece um layout rolável que rola automaticamente com novas mensagens
3. **`Message`** renderiza cada mensagem com suporte a streaming
4. **`InputBar`** trata a entrada de texto e envia mensagens ao pressionar Enter

## Usando outro provedor

Troque o adaptador — o restante permanece igual:

```tsx
import { openai } from '@agentskit/adapters'

const chat = useChat({
  adapter: openai({ apiKey: 'your-key', model: 'gpt-4o' }),
})
```

## Modo headless

Pule o import do tema e estilize você mesmo:

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
// Sem import de tema — os componentes renderizam só com atributos data-ak-*

function App() {
  const chat = useChat({ adapter: myAdapter })
  return (
    <ChatContainer className="my-chat">
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```
