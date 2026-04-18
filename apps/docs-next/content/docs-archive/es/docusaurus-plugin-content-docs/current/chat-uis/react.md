---
sidebar_position: 1
---

# @agentskit/react

Interfaz de chat para React basada en [`@agentskit/core`](../packages/core). Ofrece tres hooks y siete componentes sin estilo (headless) que se maquetan con variables CSS.

## Cuándo usarlo

- **Chat con streaming** en el navegador con adaptadores LLM intercambiables y, opcionalmente, herramientas, memoria, RAG y skills.
- Quieres marcado **headless** (`data-ak-*`) y tu propio CSS o sistema de diseño.

**Considera** [`@agentskit/ink`](./ink) para aplicaciones de terminal y [`@agentskit/runtime`](../agents/runtime) para agentes sin interfaz y sin React.

## Instalación

```bash
npm install @agentskit/react @agentskit/core
# optional: real AI providers
npm install @agentskit/adapters
```

## Hooks

### `useChat`

El hook principal. Crea y gestiona una sesión de chat completa.

```tsx
import { useChat } from '@agentskit/react'

const chat = useChat({
  adapter: myAdapter,          // required — AdapterFactory
  systemPrompt: 'You are...', // optional
  memory: myMemory,           // optional — ChatMemory
  tools: [...],               // optional — ToolDefinition[]
})
```

#### Configuración de `useChat` (`ChatConfig`)

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `adapter` | `AdapterFactory` | **Obligatorio.** Fábrica de proveedor desde `@agentskit/adapters` o personalizada. |
| `systemPrompt` | `string` | Se antepone como mensaje de sistema al enviar. |
| `temperature` | `number` | Se pasa al adaptador cuando está soportado. |
| `maxTokens` | `number` | Límite superior de longitud de la respuesta cuando está soportado. |
| `tools` | `ToolDefinition[]` | Funciones que el modelo puede invocar; los resultados vuelven como mensajes de herramienta. |
| `skills` | `SkillDefinition[]` | Amplían el system prompt e inyectan herramientas de skill antes del envío. |
| `memory` | `ChatMemory` | Persiste y recarga `Message[]` entre sesiones ([Memoria](../data-layer/memory)). |
| `retriever` | `Retriever` | Inyecta contexto recuperado en cada turno ([RAG](../data-layer/rag)). |
| `initialMessages` | `Message[]` | Semilla la transcripción antes del primer mensaje del usuario. |
| `onMessage` | callback | Se invoca con cada `Message` persistido cuando el controlador actualiza el historial. |
| `onError` | callback | Errores de stream o de herramientas. |
| `onToolCall` | callback | Observar o interceptar la ejecución de herramientas ([Herramientas](../agents/tools)). |
| `observers` | `Observer[]` | Flujo de eventos de bajo nivel ([Observabilidad](../infrastructure/observability)). |

El hook también expone métodos del controlador como **`approve` / `deny`** para herramientas con humano en el bucle cuando las definiciones de herramienta solicitan confirmación.

Devuelve un objeto `ChatReturn`:

| Propiedad | Tipo | Descripción |
|---|---|---|
| `messages` | `Message[]` | Historial completo de la conversación |
| `input` | `string` | Valor actual del campo de entrada |
| `status` | `'idle' \| 'streaming' \| 'error'` | Estado de la sesión |
| `error` | `Error \| null` | Último error, si lo hay |
| `send(text)` | `(text: string) => void` | Enviar un mensaje |
| `stop()` | `() => void` | Abortar el stream actual |
| `retry()` | `() => void` | Reintentar la última petición |
| `setInput(val)` | `(val: string) => void` | Actualizar el valor de entrada |
| `clear()` | `() => void` | Vaciar la conversación |
| `approve(id)` / `deny(id, reason?)` | | Confirmar o rechazar llamadas a herramienta pendientes cuando aplique. |

### `useStream`

Hook de más bajo nivel para consumir un único `StreamSource` directamente.

```tsx
import { useStream } from '@agentskit/react'

const { text, status, error, stop } = useStream(source, {
  onChunk: (chunk) => console.log(chunk),
  onComplete: (full) => console.log('done', full),
  onError: (err) => console.error(err),
})
```

### `useReactive`

Contenedor de estado reactivo que dispara re-renderizados ante mutaciones de propiedades.

```tsx
import { useReactive } from '@agentskit/react'

const state = useReactive({ count: 0, label: 'hello' })
// Mutate directly — component re-renders automatically
state.count++
```

## Ejemplo completo (adaptador demo — sin API key)

```tsx
import { useChat, ChatContainer, Message, InputBar, ThinkingIndicator } from '@agentskit/react'
import type { AdapterFactory } from '@agentskit/react'
import '@agentskit/react/theme'

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
            await new Promise(r => setTimeout(r, 40))
            yield { type: 'text' as const, content: chunk }
          }
          yield { type: 'done' as const }
        },
        abort: () => { cancelled = true },
      }
    },
  }
}

export default function App() {
  const chat = useChat({
    adapter: createDemoAdapter(),
    systemPrompt: 'You are a helpful assistant.',
  })

  return (
    <ChatContainer>
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} placeholder="Say something..." />
    </ChatContainer>
  )
}
```

## Cambiar a un proveedor real

Sustituye el adaptador — no cambia nada más:

```tsx
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
```

```tsx
import { openai } from '@agentskit/adapters'

const chat = useChat({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }),
})
```

## Atributos `data-ak-*`

Cada componente emite atributos `data-ak-*` para que puedas dar estilo o seleccionarlos sin clases:

| Atributo | Elemento | Valores |
|---|---|---|
| `data-ak-chat-container` | `<div>` contenedor | — |
| `data-ak-message` | contenedor del mensaje | — |
| `data-ak-role` | contenedor del mensaje | `user`, `assistant`, `system`, `tool` |
| `data-ak-status` | contenedor del mensaje | `idle`, `streaming`, `done`, `error` |
| `data-ak-content` | cuerpo del mensaje | — |
| `data-ak-avatar` | slot del avatar | — |
| `data-ak-actions` | slot de acciones | — |
| `data-ak-input-bar` | contenedor del formulario | — |
| `data-ak-input` | textarea | — |
| `data-ak-send` | botón de envío | — |
| `data-ak-thinking` | div de “thinking” | — |
| `data-ak-markdown` | contenedor markdown | — |
| `data-ak-streaming` | contenedor markdown | `true` mientras hay streaming |
| `data-ak-code-block` | contenedor del bloque de código | — |
| `data-ak-language` | contenedor del bloque de código | cadena del lenguaje |
| `data-ak-copy` | botón copiar | — |
| `data-ak-tool-call` | contenedor de la llamada a herramienta | — |
| `data-ak-tool-status` | contenedor de la llamada a herramienta | `pending`, `running`, `done`, `error` |

Consulta [Temas](./theming.md) para la referencia completa de variables CSS.

## Composición

- Prefiere **envoltorios presentacionales pequeños** alrededor de `ChatContainer`, `Message` e `InputBar` en lugar de bifurcar el interior.
- Usa **`data-ak-*`** para tokens de tema; para MUI/shadcn, ve [Chat MUI](../examples/mui-chat) y [Chat shadcn](../examples/shadcn-chat).
- **`ToolCallView`** y **`Markdown`** aceptan props estándar — combínalos con tu router para enlaces profundos dentro del contenido del asistente.

## Notas de producción

- Mantén las **API keys en el servidor** cuando sea posible (route handlers, server actions); usa [`vercelAI`](../data-layer/adapters) o un BFF fino que devuelva un stream.
- Alinea las **versiones de `@agentskit/*`** en el mismo minor para evitar desajustes de tipos con `core`.

## Solución de problemas

| Síntoma | Causa probable |
|---------|----------------|
| Mensajes duplicados en React Strict Mode | Esperable en desarrollo; en producción debería coincidir con un solo montaje. Si no, asegura un solo `useChat` por id de sesión. |
| Stream atascado en `streaming` | El adaptador no emitió `{ type: 'done' }` o la red colgó; llama a `stop()` e inspecciona `abort` del adaptador. |
| Las herramientas nunca se invocan | `description` / `schema` débiles; el modelo puede ignorarlos. Refuerza el schema y el system prompt. |
| Faltan estilos | Importa `@agentskit/react/theme` o define variables CSS desde [Temas](./theming). |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/react`) · [Componentes](./components) · [Temas](./theming) · [Ink](./ink) · [@agentskit/core](../packages/core)
