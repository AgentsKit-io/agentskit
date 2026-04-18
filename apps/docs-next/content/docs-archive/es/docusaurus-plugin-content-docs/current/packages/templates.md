---
sidebar_position: 3
title: '@agentskit/templates'
description: "Andamiaje de paquetes listos para npm — herramientas, skills y adaptadores: fábricas, validación y estructura en disco."
---

# `@agentskit/templates`

Kit de autoría para **generar** extensiones de AgentsKit: objetos `ToolDefinition` / `SkillDefinition` / `AdapterFactory` validados y **andamiajes en disco** (package.json, tsup, tests, README). Solo depende de [`@agentskit/core`](./core).

## Cuándo usarlo

- Publicas **herramientas personalizadas**, **skills** o **adaptadores** como paquetes independientes.
- Quieres **planos coherentes** (tsup, vitest, TypeScript) en plugins internos.
- Necesitas **validación en runtime** antes de registrar una plantilla con un runtime o marketplace.

## Instalación

```bash
npm install @agentskit/templates @agentskit/core
```

## API pública

| Exportación | Rol |
|--------|------|
| `createToolTemplate(config)` | Construir un `ToolDefinition` con valores por defecto y validación |
| `createSkillTemplate(config)` | Construir un `SkillDefinition` con valores por defecto y validación |
| `createAdapterTemplate(config)` | Construir un `AdapterFactory` + `name` para mostrar |
| `scaffold(config)` | Escribir un directorio de paquete completo (async) |
| `validateToolTemplate` / `validateSkillTemplate` / `validateAdapterTemplate` | Comprobar definiciones bien formadas |

### `createToolTemplate`

`ToolTemplateConfig` extiende una herramienta parcial con `name` obligatorio y opcionalmente `description`, `schema`, `execute`, `tags`, `category`, `requiresConfirmation`, `init`, `dispose`, y fusión `base`.

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

La validación **lanza** si falta `name`, `description`, `schema` o `execute` (los LLMs necesitan schema + description para tool calling).

### `createSkillTemplate`

Requiere `name`, `description` y `systemPrompt`. Opcional: `examples`, `tools`, `delegates`, `temperature`, `onActivate`, `base`.

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

Requiere `name` y `createSource` acorde a `AdapterFactory['createSource']`.

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

Crea un directorio `join(dir, name)` con:

- `package.json`, `tsconfig.json`, `tsup.config.ts`
- `src/index.ts` (implementación esqueleto)
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

`ScaffoldType` es `'tool' | 'skill' | 'adapter'`.

Registra los paquetes generados como cualquier otra herramienta, skill o adaptador vía [`createRuntime`](../agents/runtime) o [`useChat`](../hooks/use-chat).

## Solución de problemas

| Error | Causa |
|-------|--------|
| `Tool requires a name` | Pasa `name` a `createToolTemplate`. |
| `requires a schema` | Se requiere JSON Schema para function calling. |
| `Skill ... requires a systemPrompt` | Los skills deben definir comportamiento con `systemPrompt`. |
| `Adapter requires createSource` | La fábrica debe exponer `createSource(request)`. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](./overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/templates`) · [@agentskit/core](./core) · [Herramientas](../agents/tools) · [Skills](../agents/skills) · [Adaptadores](../data-layer/adapters)
