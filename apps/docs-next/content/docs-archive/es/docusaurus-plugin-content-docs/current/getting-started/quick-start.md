---
sidebar_position: 2
---

# Inicio rápido

Monta un chat de IA funcional en menos de 10 líneas.

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

## Prueba los ejemplos oficiales

- App React: `apps/example-react`
- App Ink: `apps/example-ink`
- CLI: `node packages/cli/dist/bin.js chat --provider demo`

## ¿Qué está pasando?

1. **`useChat`** crea una sesión de chat conectada a un adaptador de IA
2. **`ChatContainer`** ofrece un diseño con desplazamiento que hace auto-scroll con mensajes nuevos
3. **`Message`** renderiza cada mensaje con soporte de streaming
4. **`InputBar`** gestiona el texto y envía mensajes al pulsar Enter

## Usar otro proveedor

Cambia el adaptador; todo lo demás sigue igual:

```tsx
import { openai } from '@agentskit/adapters'

const chat = useChat({
  adapter: openai({ apiKey: 'your-key', model: 'gpt-4o' }),
})
```

## Modo sin estilos (headless)

Omite la importación del tema y aplica tú los estilos:

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
// No theme import — components render with data-ak-* attributes only

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
