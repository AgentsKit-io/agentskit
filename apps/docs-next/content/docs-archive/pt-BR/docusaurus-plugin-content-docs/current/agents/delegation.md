---
sidebar_position: 4
---

# Delegação multiagente

Coordene vários agentes especialistas a partir de um agente pai usando delegação direcionada.

## Instalação

```bash
npm install @agentskit/runtime @agentskit/adapters @agentskit/skills @agentskit/tools
```

## Início rápido

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

## Como funciona

Quando você configura `delegates`, o runtime gera automaticamente ferramentas nomeadas `delegate_<name>`. O LLM pai as chama como qualquer outra ferramenta. Cada delegate executa seu próprio loop ReAct e devolve um resultado.

## DelegateConfig

```ts
interface DelegateConfig {
  skill: SkillDefinition     // required — the child's behavior
  tools?: ToolDefinition[]   // tools available to the child
  adapter?: AdapterFactory   // optional — different LLM per child
  maxSteps?: number          // default: 5
}
```

## Contexto compartilhado

```ts
const ctx = createSharedContext({ project: 'landing-page' })

runtime.run('Build it', { delegates: { ... }, sharedContext: ctx })

// Parent reads/writes
ctx.set('key', 'value')
ctx.get('key')

// Children get read-only view — set() is not available
```

## Isolamento dos filhos

- **Mensagens novas** — sem histórico do pai
- **Herdam observadores** — eventos visíveis no logging
- **Sem memória** — não compartilha a memória do pai
- **Limite de profundidade** — `maxDelegationDepth` padrão 3

## Eventos

```
[10:00:01] => delegate:start researcher [depth=1] "Research quantum computing"
[10:00:03] <= delegate:end researcher (2100ms) "Found 3 papers on..."
```

## Relacionados

- [Runtime](/docs/agents/runtime) — loop ReAct
- [Skills](/docs/agents/skills) — prompts comportamentais
- [Observability](/docs/infrastructure/observability) — eventos de trace
