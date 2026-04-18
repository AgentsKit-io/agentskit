---
sidebar_position: 4
---

# Delegación multiagente

Coordina varios agentes especialistas desde un agente padre mediante delegación dirigida.

## Instalación

```bash
npm install @agentskit/runtime @agentskit/adapters @agentskit/skills @agentskit/tools
```

## Inicio rápido

```ts
import { createRuntime, createSharedContext } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { planner, researcher, coder } from '@agentskit/skills'
import { webSearch, filesystem } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: anthropic({ apiKey, model: 'claude-sonnet-4-6' }),
})

const result = await runtime.run('Build a landing page about quantum computing', {
  skill: planner,
  delegates: {
    researcher: { skill: researcher, tools: [webSearch()], maxSteps: 3 },
    coder: { skill: coder, tools: [...filesystem({ basePath: './src' })], maxSteps: 8 },
  },
})
```

## Cómo funciona

Cuando configuras `delegates`, el runtime genera automáticamente herramientas llamadas `delegate_<name>`. El LLM padre las llama como cualquier otra herramienta. Cada delegado ejecuta su propio bucle ReAct y devuelve un resultado.

## DelegateConfig

```ts
interface DelegateConfig {
  skill: SkillDefinition     // required — the child's behavior
  tools?: ToolDefinition[]   // tools available to the child
  adapter?: AdapterFactory   // optional — different LLM per child
  maxSteps?: number          // default: 5
}
```

## Contexto compartido

```ts
const ctx = createSharedContext({ project: 'landing-page' })

runtime.run('Build it', { delegates: { ... }, sharedContext: ctx })

// Parent reads/writes
ctx.set('key', 'value')
ctx.get('key')

// Children get read-only view — set() is not available
```

## Aislamiento del hijo

- **Mensajes nuevos** — sin historial del padre
- **Hereda observadores** — eventos visibles en el registro
- **Sin memoria** — no comparte la memoria del padre
- **Límite de profundidad** — `maxDelegationDepth` por defecto 3

## Eventos

```
[10:00:01] => delegate:start researcher [depth=1] "Research quantum computing"
[10:00:03] <= delegate:end researcher (2100ms) "Found 3 papers on..."
```

## Relacionado

- [Runtime](/docs/agents/runtime) — bucle ReAct
- [Skills](/docs/agents/skills) — prompts de comportamiento
- [Observability](/docs/infrastructure/observability) — eventos de trazas
