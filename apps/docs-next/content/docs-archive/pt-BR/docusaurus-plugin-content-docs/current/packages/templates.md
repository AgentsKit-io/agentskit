---
sidebar_position: 3
title: '@agentskit/templates'
description: Scaffolding pronto para npm de ferramentas, skills e adaptadores — fábricas, validação e layout no disco.
---

# `@agentskit/templates`

Kit de autoria para **gerar** extensões do AgentsKit: objetos `ToolDefinition` / `SkillDefinition` / `AdapterFactory` validados e **scaffolds no disco** (package.json, tsup, testes, README). Depende apenas de [`@agentskit/core`](./core).

## Quando usar

- Você publica **ferramentas**, **skills** ou **adaptadores** personalizados como pacotes independentes.
- Você quer **blueprints consistentes** (tsup, vitest, TypeScript) entre plugins internos.
- Você precisa de **validação em runtime** antes de registrar um template num runtime ou marketplace.

## Instalação

```bash
npm install @agentskit/templates @agentskit/core
```

## API pública

| Exportação | Papel |
|--------|------|
| `createToolTemplate(config)` | Monta um `ToolDefinition` com padrões e validação |
| `createSkillTemplate(config)` | Monta um `SkillDefinition` com padrões e validação |
| `createAdapterTemplate(config)` | Monta um `AdapterFactory` + `name` de exibição |
| `scaffold(config)` | Escreve um diretório de pacote completo (async) |
| `validateToolTemplate` / `validateSkillTemplate` / `validateAdapterTemplate` | Garante definições bem formadas |

### `createToolTemplate`

`ToolTemplateConfig` estende uma ferramenta parcial com `name` obrigatório e opcional `description`, `schema`, `execute`, `tags`, `category`, `requiresConfirmation`, `init`, `dispose` e merge `base`.

```ts
import { createToolTemplate } from '@agentskit/templates'

export const rollDice = createToolTemplate({
  name: 'roll_dice',
  description: 'Roll an N-sided die once.',
  schema: {
    type: 'object',
    properties: { sides: { type: 'number', minimum: 2 } },
    required: ['sides'],
  },
  async execute(args) {
    const sides = Number(args.sides)
    return String(1 + Math.floor(Math.random() * sides))
  },
})
```

A validação **lança** se `name`, `description`, `schema` ou `execute` estiver faltando (LLMs precisam de schema + description para tool calling).

### `createSkillTemplate`

Exige `name`, `description` e `systemPrompt`. Opcional: `examples`, `tools`, `delegates`, `temperature`, `onActivate`, `base`.

```ts
import { createSkillTemplate } from '@agentskit/templates'

export const researcher = createSkillTemplate({
  name: 'researcher',
  description: 'Gather facts before writing.',
  systemPrompt: 'You are a careful researcher. Cite sources when possible.',
  tools: ['web_search'],
})
```

### `createAdapterTemplate`

Exige `name` e `createSource` compatível com `AdapterFactory['createSource']`.

```ts
import { createAdapterTemplate } from '@agentskit/templates'

export const myAdapter = createAdapterTemplate({
  name: 'my-llm',
  createSource: (request) => {
    // return StreamSource compatible with @agentskit/core
    throw new Error('Implement streaming to your backend')
  },
})
```

### `scaffold`

Cria um diretório `join(dir, name)` com:

- `package.json`, `tsconfig.json`, `tsup.config.ts`
- `src/index.ts` (stub)
- `tests/index.test.ts`
- `README.md`

```ts
import { scaffold } from '@agentskit/templates'
import { join } from 'node:path'

const files = await scaffold({
  type: 'tool',
  name: 'my-company-search',
  dir: join(process.cwd(), 'packages'),
  description: 'Internal web search tool',
})
console.log('Created:', files)
```

`ScaffoldType` é `'tool' | 'skill' | 'adapter'`.

Registre pacotes gerados como qualquer outra ferramenta, skill ou adaptador via [`createRuntime`](../agents/runtime) ou [`useChat`](../hooks/use-chat).

## Solução de problemas

| Erro | Causa |
|-------|--------|
| `Tool requires a name` | Passe `name` a `createToolTemplate`. |
| `requires a schema` | JSON Schema é obrigatório para function calling. |
| `Skill ... requires a systemPrompt` | Skills devem definir comportamento via `systemPrompt`. |
| `Adapter requires createSource` | A fábrica deve expor `createSource(request)`. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](./overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/templates`) · [@agentskit/core](./core) · [Ferramentas](../agents/tools) · [Skills](../agents/skills) · [Adaptadores](../data-layer/adapters)
