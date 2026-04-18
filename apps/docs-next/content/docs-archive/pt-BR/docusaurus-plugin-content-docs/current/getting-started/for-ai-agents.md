---
sidebar_position: 3
---

# Para agentes de IA

Toda a API do AgentsKit em uma página. Cole isto no contexto do seu LLM.

## Chat (React / Ink)

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react' // ou @agentskit/ink
import { anthropic } from '@agentskit/adapters'

const chat = useChat({ adapter: anthropic({ apiKey, model: 'claude-sonnet-4-6' }), tools, skills })
chat.send('message')    // envia e faz streaming da resposta
chat.stop()             // aborta o stream
chat.retry()            // tenta de novo a última
chat.messages           // Message[]
chat.status             // 'idle' | 'streaming' | 'error'

<ChatContainer>
  <Message message={m} />
  <InputBar chat={chat} />
</ChatContainer>
```

## Adaptadores — troque em uma linha

```ts
import { anthropic, openai, gemini, ollama, deepseek, grok, kimi, vercelAI, generic } from '@agentskit/adapters'

anthropic({ apiKey, model })   // openai({ apiKey, model })
gemini({ apiKey, model })      // ollama({ model })
vercelAI({ api: '/api/chat' }) // generic({ send: async (msgs) => ReadableStream })
```

## Executando agentes (sem UI)

```ts
import { createRuntime } from '@agentskit/runtime'

const runtime = createRuntime({ adapter, tools, skills, observers, memory })
const result = await runtime.run('task', { skill, delegates, signal })
// → { content, messages, steps, toolCalls, durationMs }
```

## Ferramentas

```ts
import { webSearch, filesystem, shell, listTools } from '@agentskit/tools'

webSearch()                              // DuckDuckGo (sem chave)
webSearch({ provider: 'serper', apiKey }) // Serper
filesystem({ basePath: './workspace' })  // → [read_file, write_file, list_directory]
shell({ timeout: 10_000, allowed: ['ls', 'cat'] })
```

## Skills

```ts
import { researcher, coder, planner, critic, summarizer, composeSkills } from '@agentskit/skills'

runtime.run('task', { skill: researcher })
const combined = composeSkills(researcher, coder) // mescla prompts, tools, delegates
```

## Delegação multiagente

```ts
runtime.run('Build a landing page', {
  delegates: {
    researcher: { skill: researcher, tools: [webSearch()], maxSteps: 3 },
    coder: { skill: coder, tools: [...filesystem({ basePath: './src' })] },
  },
  sharedContext: createSharedContext(),
})
```

## Memória

```ts
import { sqliteChatMemory, fileVectorMemory } from '@agentskit/memory'

sqliteChatMemory({ path: './chat.db' })            // ChatMemory
fileVectorMemory({ path: './vectors' })             // VectorMemory (vectra)
```

## RAG

```ts
import { createRAG } from '@agentskit/rag'

const rag = createRAG({ embed: openaiEmbedder({ apiKey }), store: fileVectorMemory({ path: './v' }) })
await rag.ingest(documents)
const docs = await rag.retrieve('query')
```

## Observabilidade

```ts
import { consoleLogger, langsmith, opentelemetry } from '@agentskit/observability'

createRuntime({ adapter, observers: [consoleLogger(), langsmith({ apiKey })] })
```

## Sandbox

```ts
import { sandboxTool } from '@agentskit/sandbox'
// → ToolDefinition para execução segura de JS/Python via E2B
```

## Avaliação (eval)

```ts
import { runEval } from '@agentskit/eval'

const result = await runEval({
  agent: async (input) => runtime.run(input).then(r => r.content),
  suite: { name: 'qa', cases: [{ input: 'Q', expected: 'A' }] },
})
// → { accuracy, passed, failed, results: [{ latencyMs, tokenUsage? }] }
```

## Tipos

```ts
Message { id, role, content, status, toolCalls?, metadata?, createdAt }
ToolCall { id, name, args, result?, error?, status }
ToolDefinition { name, description?, schema?, execute?, init?, dispose?, tags?, category? }
SkillDefinition { name, description, systemPrompt, tools?, delegates?, onActivate? }
RunResult { content, messages, steps, toolCalls, durationMs }
AgentEvent = 'llm:start' | 'llm:end' | 'tool:start' | 'tool:end' | 'agent:step' | 'agent:delegate:start' | ...
```
