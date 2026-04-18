---
sidebar_position: 1
---

# Runtime

`@agentskit/runtime` es el motor de ejecución para agentes autónomos. Ejecuta un bucle ReAct — observar, pensar, actuar — hasta que el modelo produce una respuesta final o se alcanza un límite de pasos.

## Cuándo usarlo

- Agentes **sin interfaz** (workers de CLI, trabajos, pruebas) con herramientas, memoria, recuperación y delegación opcional.
- Ya usas [`@agentskit/adapters`](../data-layer/adapters); las mismas fábricas funcionan aquí.

Para chat interactivo en terminal prefieres [`@agentskit/ink`](../chat-uis/ink); para UI en el navegador prefieres [`@agentskit/react`](../chat-uis/react).

## Instalación

```bash
npm install @agentskit/runtime @agentskit/adapters
```

[`@agentskit/core`](../packages/core) se incluye de forma transitiva; añádelo explícitamente si necesitas tipos sin cargar todo el grafo del runtime.

## Uso básico

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
})

const result = await runtime.run('What is 3 + 4?')
console.log(result.content) // "7"
```

### Adaptador de demostración (sin clave API)

```ts
import { createRuntime } from '@agentskit/runtime'
import { generic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: generic({ /* custom send/parse */ }),
})
```

## Bucle ReAct

Cada llamada a `runtime.run()` entra en el siguiente bucle:

```
observe  →  think  →  act  →  observe  →  ...
```

1. **Observar** — recupera contexto de la memoria o de un recuperador y lo inyecta en el prompt.
2. **Pensar** — envía mensajes y herramientas al LLM y transmite la respuesta.
3. **Actuar** — si el LLM llama herramientas, las ejecuta y añade los resultados como mensajes `tool`.
4. Repite hasta que el modelo devuelva texto plano o se alcance `maxSteps`.

## `RunResult`

`runtime.run()` se resuelve en un objeto `RunResult`:

```ts
interface RunResult {
  content: string      // Final text response from the model
  messages: Message[]  // Full conversation including tool calls and results
  steps: number        // How many loop iterations ran
  toolCalls: ToolCall[] // Every tool call made during the run
  durationMs: number   // Total wall-clock time
}
```

### Ejemplo

```ts
const result = await runtime.run('List the files in the current directory', {
  tools: [shell({ allowed: ['ls'] })],
})

console.log(result.content)   // Model's final answer
console.log(result.steps)     // e.g. 2
console.log(result.durationMs) // e.g. 1340
result.toolCalls.forEach(tc => {
  console.log(tc.name, tc.args, tc.result)
})
```

## `RuntimeConfig`

```ts
interface RuntimeConfig {
  adapter: AdapterFactory        // Required — the LLM provider
  tools?: ToolDefinition[]       // Tools available to the agent
  systemPrompt?: string          // Default system prompt
  memory?: ChatMemory            // Persist and reload conversation history
  retriever?: Retriever          // RAG source injected each step
  observers?: Observer[]         // Event listeners (logging, tracing)
  maxSteps?: number              // Max loop iterations (default: 10)
  temperature?: number
  maxTokens?: number
  delegates?: Record<string, DelegateConfig>
  maxDelegationDepth?: number    // Default: 3
}
```

## `RunOptions`

Sobrescribe los valores por defecto por llamada en `runtime.run(task, options)`:

```ts
const result = await runtime.run('Summarize this document', {
  systemPrompt: 'You are a concise summarizer.',
  tools: [readFileTool],
  maxSteps: 5,
  skill: summarizer,
})
```

## Abortar una ejecución

Pasa un `AbortSignal` para cancelar a mitad de ejecución. El runtime comprueba la señal antes de cada paso y antes de cada llamada a herramientas.

```ts
const controller = new AbortController()

setTimeout(() => controller.abort(), 5000) // cancel after 5 s

const result = await runtime.run('Long running task', {
  signal: controller.signal,
})
```

## Memoria

Cuando se configura `memory`, el runtime guarda todos los mensajes al final de cada ejecución. En la siguiente ejecución recarga el contexto anterior automáticamente.

```ts
import { createRuntime } from '@agentskit/runtime'
import { createInMemoryMemory } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  memory: createInMemoryMemory(),
})

await runtime.run('My name is Alice.')
const result = await runtime.run('What is my name?')
console.log(result.content) // "Your name is Alice."
```

Para almacenamiento persistente usa [`sqliteChatMemory` o `redisChatMemory`](../data-layer/memory) de `@agentskit/memory`.

La memoria se guarda después de ensamblar `RunResult` — si abortas antes, los mensajes parciales siguen persistiendo hasta el punto del aborto.

## Recuperador (RAG)

Pasa un `Retriever` (por ejemplo de [`createRAG`](../data-layer/rag)) mediante `retriever` en `RuntimeConfig`. Cada paso del bucle puede inyectar contexto recuperado antes de que el modelo piense — mismo contrato que la UI de chat.

## Observadores

`observers` acepta instancias [`Observer`](../packages/core) de `@agentskit/core` para eventos de bajo nivel. Combínalo con [`@agentskit/observability`](../infrastructure/observability) cuando necesites trazas estructuradas.

## Solución de problemas

| Síntoma | Posible solución |
|---------|------------|
| Alcanza `maxSteps` sin respuesta | El modelo sigue llamando herramientas; sube `maxSteps`, afina descripciones de herramientas o ajusta el prompt del sistema. |
| Tiempo de espera / bloqueo de herramienta | Añade `signal` con un plazo; asegúrate de que las herramientas rechacen bajo sobrecarga. |
| Sin contexto previo | Confirma que `memory` usa el mismo `conversationId` (en backends que delimitan por id). |
| Recuperación vacía | Comprueba que las dimensiones del embedder coincidan con el almacén vectorial; verifica que la ingestión se ejecutó para tu corpus. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/runtime`) · [Herramientas](./tools) · [Skills](./skills) · [Delegación](./delegation) · [@agentskit/core](../packages/core)
