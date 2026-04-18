---
sidebar_position: 3
---

# useChat

Orquestador de alto nivel para la sesión de chat. Gestiona mensajes, streaming y el estado del campo de entrada.

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

### Configuración

| Parámetro | Tipo | Descripción |
|-------|------|-------------|
| `adapter` | `AdapterFactory` | Adaptador del proveedor de IA |
| `onMessage` | `(msg: Message) => void` | Se llama cuando el mensaje del asistente termina |
| `onError` | `(err: Error) => void` | Se llama ante error de stream |
| `initialMessages` | `Message[]` | Pre-rellenar el historial del chat |

### Valor devuelto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `messages` | `Message[]` | Todos los mensajes de la conversación |
| `send` | `(text: string) => void` | Envía un mensaje de usuario y hace stream de la respuesta |
| `stop` | `() => void` | Aborta el stream actual |
| `retry` | `() => void` | Reintenta el último mensaje del asistente |
| `status` | `StreamStatus` | Estado actual del streaming |
| `input` | `string` | Valor actual del campo de entrada |
| `setInput` | `(value: string) => void` | Actualiza el valor de entrada |
