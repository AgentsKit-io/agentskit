---
sidebar_position: 3
---

# useChat

Orquestrador de sessão de chat de alto nível. Gerencia mensagens, streaming e estado da entrada.

## Uso

```tsx
import { useChat } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'

function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: 'key', model: 'claude-sonnet-4-6' }),
    onMessage: (msg) => console.log('Received:', msg.content),
  })

  return (
    <div>
      {chat.messages.map(msg => (
        <div key={msg.id}>{msg.role}: {msg.content}</div>
      ))}
      <input value={chat.input} onChange={e => chat.setInput(e.target.value)} />
      <button onClick={() => chat.send(chat.input)}>Send</button>
      {chat.status === 'streaming' && <button onClick={chat.stop}>Stop</button>}
    </div>
  )
}
```

## API

```ts
const chat = useChat(config)
```

### Configuração

| Parâmetro | Tipo | Descrição |
|-------|------|-------------|
| `adapter` | `AdapterFactory` | Adaptador do provedor de IA |
| `onMessage` | `(msg: Message) => void` | Chamado quando a mensagem do assistente conclui |
| `onError` | `(err: Error) => void` | Chamado em erro de stream |
| `initialMessages` | `Message[]` | Pré-preenche o histórico do chat |

### Retorno

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `messages` | `Message[]` | Todas as mensagens da conversa |
| `send` | `(text: string) => void` | Envia mensagem do usuário e faz streaming da resposta |
| `stop` | `() => void` | Aborta o stream atual |
| `retry` | `() => void` | Repete a última mensagem do assistente |
| `status` | `StreamStatus` | Status atual do streaming |
| `input` | `string` | Valor atual da entrada |
| `setInput` | `(value: string) => void` | Atualiza o valor da entrada |
