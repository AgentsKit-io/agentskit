---
sidebar_position: 1
---

# Observabilidade

`@agentskit/observability` fornece implementações plugáveis de **`Observer`** para fluxos `AgentEvent` de [`@agentskit/core`](../packages/core). Os observadores são amigáveis à preguiça: importe só os backends que você ligar a [`createRuntime`](../agents/runtime) ou [`useChat`](../hooks/use-chat) via `observers` na config.

## Quando usar

- Você precisa de **logs estruturados** durante passos do agente (`consoleLogger`).
- Você exporta traces para **LangSmith** ou coletores compatíveis com **OpenTelemetry**.

## Instalação

```bash
npm install @agentskit/observability @agentskit/core
```

## Observadores embutidos

### Logger de console

```ts
import { consoleLogger } from '@agentskit/observability'

const observer = consoleLogger({ format: 'human' }) // or 'json'
```

Human: stderr colorido e indentado. JSON: eventos delimitados por nova linha para pipelines de ingestão.

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

Spans seguem convenções semânticas GenAI quando aplicável.

## Anexar ao runtime

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

Passe o mesmo array `observers` a [`useChat`](../hooks/use-chat) para sessões no navegador.

## `createTraceTracker`

Helper de baixo nível que transforma `AgentEvent` em callbacks de span início/fim — use quando precisar de um **exportador customizado**, mas ainda quiser timing pai/filho consistente.

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

## Referência `AgentEvent` (core)

Os eventos são definidos em `@agentskit/core` (não exaustivo aqui — veja TypeDoc):

| Tipo de evento | Significado |
|------------|---------|
| `llm:start` / `llm:first-token` / `llm:end` | Ciclo de vida da chamada ao modelo |
| `tool:start` / `tool:end` | Execução de ferramenta |
| `memory:load` / `memory:save` | Persistência da memória de chat |
| `agent:step` | Marcador de passo ReAct |
| `agent:delegate:start` / `agent:delegate:end` | Delegação de subagente |
| `error` | Superfície de erro recuperável ou fatal |

## Observador customizado

Implemente `Observer` de `@agentskit/core`:

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

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| Sem spans no LangSmith | Verifique `LANGSMITH_API_KEY` e nome do projeto; chegue egresso de rede da CI. |
| OTLP descarta dados | Confirme URL do coletor e modo HTTP/protobuf compatível com sua stack. |
| Log duplicado | Deduplique observadores — cada `on` recebe todo evento. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/observability`) · [Eval](./eval) · [Runtime](../agents/runtime) · [@agentskit/core](../packages/core)
