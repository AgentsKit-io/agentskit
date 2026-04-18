---
sidebar_position: 2
title: '@agentskit/core'
description: Base sem dependências — tipos, createChatController, primitivas de streaming, helpers de memória e utilitários do loop de agente.
---

# `@agentskit/core`

A **camada de contrato** compartilhada do AgentsKit: tipos TypeScript, o controlador de chat headless, helpers de stream e blocos de construção usados por `@agentskit/react`, `@agentskit/ink`, `@agentskit/runtime` e adaptadores. **Sem dependências de runtime de terceiros** — mantenha este pacote pequeno e estável.

## Quando usar

- Você implementa um **adaptador**, ferramenta, memória ou UI **personalizado** sobre os tipos oficiais.
- Você precisa de **`createChatController`** sem React (integrações avançadas).
- Você quer entender **mensagens, chamadas de ferramenta e chunks de stream** em todo o ecossistema.

Em geral você **não** importa `core` diretamente num app React típico, exceto para tipos — prefira [`useChat`](../hooks/use-chat) e [`@agentskit/react`](../chat-uis/react).

## Instalação

```bash
npm install @agentskit/core
```

A maioria dos pacotes de recurso já depende de `core`; você adiciona explicitamente ao criar bibliotecas ou compartilhar tipos.

## Exportações públicas (visão geral)

### Controlador de chat e configuração

| Exportação | Papel |
|--------|------|
| `createChatController` | Máquina de estados headless: enviar, stream, ferramentas, memória, skills, retriever |
| Tipos: `ChatConfig`, `ChatController`, `ChatState`, `ChatReturn` | Forma da configuração e do controlador |

O controlador mescla system prompts, executa recuperação, despacha chamadas de ferramenta, persiste via `ChatMemory` e expõe padrões subscribe/update consumidos pelos pacotes de UI.

### Primitivas e streams

| Exportação | Papel |
|--------|------|
| `buildMessage` | Constrói um `Message` tipado |
| `consumeStream` | Conduz `StreamSource` → chunks + conclusão |
| `createEventEmitter` | Barramento de eventos interno para observadores |
| `executeToolCall` | Executa uma ferramenta a partir do payload `ToolCall` |
| `safeParseArgs` | Faz parse seguro de argumentos JSON de ferramenta |
| `createToolLifecycle` | `init` / `dispose` para ferramentas |
| `generateId` | IDs estáveis para mensagens e chamadas |

### Helpers do loop de agente

| Exportação | Papel |
|--------|------|
| `buildToolMap` | Mapa nome → `ToolDefinition` |
| `activateSkills` | Mescla system prompts de skills e ferramentas fornecidas pelas skills |
| `executeSafeTool` | Execução protegida (hooks de confirmação, erros) |

### Memória e RAG (leve)

| Exportação | Papel |
|--------|------|
| `createInMemoryMemory`, `createLocalStorageMemory`, `createFileMemory` | Memórias simples embutidas para testes ou demos |
| `serializeMessages` / `deserializeMessages` | Helpers de persistência |
| `createStaticRetriever`, `formatRetrievedDocuments` | Helpers de retriever para contexto estático |

Backends pesados ficam em [`@agentskit/memory`](../data-layer/memory); armazenamento vetorial e fragmentação em [`@agentskit/rag`](../data-layer/rag).

### Arquivo de configuração

| Exportação | Papel |
|--------|------|
| `loadConfig` | Carrega `AgentsKitConfig` do projeto (CLI / tooling) |

### Tipos (nível alto)

`AdapterFactory`, `StreamSource`, `StreamChunk`, `Message`, `ToolDefinition`, `ToolCall`, `SkillDefinition`, `ChatMemory`, `Retriever`, `VectorMemory`, `Observer`, `AgentEvent` e tipos relacionados — assinaturas completas no TypeDoc (abaixo).

## Exemplo: inspecionar tipos numa ferramenta customizada

```ts
import type { ToolDefinition, ToolExecutionContext } from '@agentskit/core'

export const myTool: ToolDefinition = {
  name: 'greet',
  description: 'Greets a user by name.',
  schema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async execute(args: Record<string, unknown>, _ctx: ToolExecutionContext) {
    const name = String(args.name ?? 'world')
    return `Hello, ${name}!`
  },
}
```

## Exemplo: controlador headless (avançado)

```ts
import { createChatController } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const chat = createChatController({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
})

chat.subscribe(() => {
  console.log(chat.getState().status, chat.getState().messages.length)
})

await chat.send('Hello')
```

Prefira `useChat` em apps React — ele encapsula esse padrão com hooks.

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| Erros de tipo após upgrade | Fixe todos os `@agentskit/*` na mesma semver; os tipos de `core` acompanham o ecossistema. |
| `createChatController` vs `useChat` | O controlador é agnóstico de framework; o hook React adiciona binding de estado e segurança no Strict Mode. |
| Preocupação com tamanho do bundle | Tree-shake exportações não usadas; evite importar utilitários só de servidor em bundles de cliente. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](./overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/core`) · [React](../chat-uis/react) · [Ink](../chat-uis/ink) · [Adaptadores](../data-layer/adapters) · [Runtime](../agents/runtime) · [Ferramentas](../agents/tools) · [Skills](../agents/skills) · [useChat](../hooks/use-chat) · [useStream](../hooks/use-stream) · [useReactive](../hooks/use-reactive)
