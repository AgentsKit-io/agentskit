---
sidebar_position: 1
---

# Runtime

`@agentskit/runtime` é o motor de execução para agentes autônomos. Executa um loop ReAct — observar, pensar, agir — até o modelo produzir uma resposta final ou um limite de passos ser atingido.

## Quando usar

- Agentes **headless** (workers de CLI, jobs, testes) com ferramentas, memória, recuperação e delegação opcional.
- Você já usa [`@agentskit/adapters`](../data-layer/adapters); as mesmas fábricas funcionam aqui.

Para chat interativo no terminal prefira [`@agentskit/ink`](../chat-uis/ink); para UI no navegador prefira [`@agentskit/react`](../chat-uis/react).

## Instalação

```bash
npm install @agentskit/runtime @agentskit/adapters
```

[`@agentskit/core`](../packages/core) entra transitivamente; adicione explicitamente se precisar de tipos sem puxar o grafo completo do runtime.

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

### Adaptador de demo (sem chave de API)

```ts
import { createRuntime } from '@agentskit/runtime'
import { generic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: generic({ /* custom send/parse */ }),
})
```

## Loop ReAct

Cada chamada a `runtime.run()` entra no seguinte loop:

```
observe  →  think  →  act  →  observe  →  ...
```

1. **Observar** — recuperar contexto da memória ou de um retriever e injetá-lo no prompt.
2. **Pensar** — enviar mensagens + ferramentas ao LLM e fazer streaming da resposta.
3. **Agir** — se o LLM chamar ferramentas, executá-las e anexar resultados como mensagens `tool`.
4. Repetir até o modelo devolver texto simples ou `maxSteps` ser atingido.

## `RunResult`

`runtime.run()` resolve para um objeto `RunResult`:

```ts
interface RunResult {
  content: string      // Final text response from the model
  messages: Message[]  // Full conversation including tool calls and results
  steps: number        // How many loop iterations ran
  toolCalls: ToolCall[] // Every tool call made during the run
  durationMs: number   // Total wall-clock time
}
```

### Exemplo

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

Substitua padrões por chamada em `runtime.run(task, options)`:

```ts
const result = await runtime.run('Summarize this document', {
  systemPrompt: 'You are a concise summarizer.',
  tools: [readFileTool],
  maxSteps: 5,
  skill: summarizer,
})
```

## Abortar uma execução

Passe um `AbortSignal` para cancelar no meio. O runtime verifica o sinal antes de cada passo e antes de cada chamada de ferramenta.

```ts
const controller = new AbortController()

setTimeout(() => controller.abort(), 5000) // cancel after 5 s

const result = await runtime.run('Long running task', {
  signal: controller.signal,
})
```

## Memória

Quando `memory` está configurada, o runtime salva todas as mensagens ao fim de cada execução. Na próxima execução recarrega o contexto anterior automaticamente.

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

Para armazenamento durável use [`sqliteChatMemory` ou `redisChatMemory`](../data-layer/memory) de `@agentskit/memory`.

A memória é salva depois que `RunResult` é montado — se você abortar cedo, mensagens parciais ainda são persistidas até o ponto do abort.

## Retriever (RAG)

Passe um `Retriever` (por exemplo de [`createRAG`](../data-layer/rag)) via `retriever` em `RuntimeConfig`. Cada passo do loop pode injetar contexto recuperado antes do modelo pensar — mesmo contrato da UI de chat.

## Observadores

`observers` aceita instâncias [`Observer`](../packages/core) de `@agentskit/core` para eventos de baixo nível. Combine com [`@agentskit/observability`](../infrastructure/observability) quando precisar de traces estruturados.

## Solução de problemas

| Sintoma | Provável correção |
|---------|------------|
| Atinge `maxSteps` sem resposta | O modelo fica chamando ferramentas; aumente `maxSteps`, reforce descrições das ferramentas ou ajuste o system prompt. |
| Timeout / travamento da ferramenta | Adicione `signal` com prazo; garanta que as ferramentas rejeitem sob carga. |
| Sem contexto anterior | Confirme que `memory` usa o mesmo `conversationId` (para backends que escopam por id). |
| Recuperação vazia | Verifique se as dimensões do embedder batem com o vector store; confira se o ingest rodou para o seu corpus. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/runtime`) · [Ferramentas](./tools) · [Skills](./skills) · [Delegação](./delegation) · [@agentskit/core](../packages/core)
