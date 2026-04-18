---
sidebar_position: 1
---

# Observabilidad

`@agentskit/observability` proporciona implementaciones **`Observer`** enchufables para flujos de `AgentEvent` de [`@agentskit/core`](../packages/core). Los observadores son compatibles con carga perezosa: importa solo los backends que conectes a [`createRuntime`](../agents/runtime) o [`useChat`](../hooks/use-chat) mediante `observers` en la configuración.

## Cuándo usarlo

- Necesitas **registros estructurados** durante los pasos del agente (`consoleLogger`).
- Exportas trazas a **LangSmith** o recolectores compatibles con **OpenTelemetry**.

## Instalación

```bash
npm install @agentskit/observability @agentskit/core
```

## Observadores integrados

### Registro en consola

```ts
import { consoleLogger } from '@agentskit/observability'

const observer = consoleLogger({ format: 'human' }) // or 'json'
```

Humano: stderr con color e indentación. JSON: eventos delimitados por saltos de línea para canalizaciones de ingesta.

### LangSmith

```ts
import { langsmith } from '@agentskit/observability'

const observer = langsmith({
  apiKey: process.env.LANGSMITH_API_KEY,
  project: 'my-agent',
})
```

### OpenTelemetry (OTLP)

```ts
import { opentelemetry } from '@agentskit/observability'

const observer = opentelemetry({
  endpoint: 'http://localhost:4318/v1/traces',
  serviceName: 'my-agent-service',
})
```

Los spans siguen convenciones semánticas de GenAI cuando aplica.

## Conectar al runtime

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { consoleLogger } from '@agentskit/observability'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  observers: [consoleLogger({ format: 'json' })],
})

await runtime.run('Hello')
```

Pasa el mismo array `observers` a [`useChat`](../hooks/use-chat) para sesiones en el navegador.

## `createTraceTracker`

Ayudante de bajo nivel que convierte `AgentEvent` en callbacks de inicio/fin de span — úsalo cuando necesites un **exportador personalizado** pero quieras tiempos coherentes padre/hijo.

```ts
import { createTraceTracker } from '@agentskit/observability'
import type { AgentEvent } from '@agentskit/core'

const tracker = createTraceTracker({
  onSpanStart(span) {
    /* send span open to your backend */
  },
  onSpanEnd(span) {
    /* close span */
  },
})

const bridge = {
  name: 'trace-bridge',
  on(event: AgentEvent) {
    tracker.handle(event)
  },
}
```

## Referencia de `AgentEvent` (core)

Los eventos están definidos en `@agentskit/core` (no exhaustivo aquí — véase TypeDoc):

| Tipo de evento | Significado |
|------------|---------|
| `llm:start` / `llm:first-token` / `llm:end` | Ciclo de vida de la llamada al modelo |
| `tool:start` / `tool:end` | Ejecución de herramientas |
| `memory:load` / `memory:save` | Persistencia de memoria de chat |
| `agent:step` | Marcador de paso ReAct |
| `agent:delegate:start` / `agent:delegate:end` | Delegación de subagente |
| `error` | Superficie de error recuperable o fatal |

## Observador personalizado

Implementa `Observer` desde `@agentskit/core`:

```ts
import type { AgentEvent, Observer } from '@agentskit/core'

const myObserver: Observer = {
  name: 'my-backend',
  on(event: AgentEvent) {
    if (event.type === 'error') {
      console.error(event.error)
    }
  },
}
```

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| Sin spans en LangSmith | Verifica `LANGSMITH_API_KEY` y el nombre del proyecto; comprueba la salida de red desde CI. |
| OTLP pierde datos | Confirma que la URL del recolector y el modo HTTP/protobuf coincidan con tu stack. |
| Doble registro | Deduplica observadores — cada `on` recibe todos los eventos. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/observability`) · [Eval](./eval) · [Runtime](../agents/runtime) · [@agentskit/core](../packages/core)
