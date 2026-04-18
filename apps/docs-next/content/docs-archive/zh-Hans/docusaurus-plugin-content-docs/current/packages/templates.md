---
sidebar_position: 3
title: '@agentskit/templates'
description: 脚手架 npm 就绪的工具、技能与适配器——工厂、校验与文件布局。
---

# `@agentskit/templates`

用于**生成** AgentsKit 扩展的创作工具包：经过校验的 `ToolDefinition` / `SkillDefinition` / `AdapterFactory` 对象，以及**磁盘脚手架**（package.json、tsup、测试、README）。仅依赖 [`@agentskit/core`](./core)。

## 何时使用

- 将**自定义工具**、**技能**或**适配器**作为独立包发布。
- 需要内部插件间**一致的蓝图**（tsup、vitest、TypeScript）。
- 在注册到 runtime 或应用市场前需要**运行时校验**。

## 安装

```bash
npm install @agentskit/templates @agentskit/core
```

## 公开 API

| 导出 | 作用 |
|--------|------|
| `createToolTemplate(config)` | 构建带默认值与校验的 `ToolDefinition` |
| `createSkillTemplate(config)` | 构建带默认值与校验的 `SkillDefinition` |
| `createAdapterTemplate(config)` | 构建 `AdapterFactory` + 显示 `name` |
| `scaffold(config)` | 写入完整包目录（异步） |
| `validateToolTemplate` / `validateSkillTemplate` / `validateAdapterTemplate` | 断言定义格式正确 |

### `createToolTemplate`

`ToolTemplateConfig` 在部分工具上扩展，必填 `name`，可选 `description`、`schema`、`execute`、`tags`、`category`、`requiresConfirmation`、`init`、`dispose` 与 `base` 合并。

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

若缺少 `name`、`description`、`schema` 或 `execute`，校验会**抛出**（LLM 调用工具需要 schema + description）。

### `createSkillTemplate`

需要 `name`、`description` 与 `systemPrompt`。可选：`examples`、`tools`、`delegates`、`temperature`、`onActivate`、`base`。

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

需要 `name` 与匹配 `AdapterFactory['createSource']` 的 `createSource`。

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

在 `join(dir, name)` 创建目录，包含：

- `package.json`、`tsconfig.json`、`tsup.config.ts`
- `src/index.ts`（桩实现）
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

`ScaffoldType` 为 `'tool' | 'skill' | 'adapter'`。

像其他工具、技能或适配器一样，通过 [`createRuntime`](../agents/runtime) 或 [`useChat`](../hooks/use-chat) 注册脚手架包。

## 故障排除

| 错误 | 原因 |
|-------|--------|
| `Tool requires a name` | 向 `createToolTemplate` 传入 `name`。 |
| `requires a schema` | 函数调用需要 JSON Schema。 |
| `Skill ... requires a systemPrompt` | 技能必须通过 `systemPrompt` 定义行为。 |
| `Adapter requires createSource` | 工厂必须暴露 `createSource(request)`。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](./overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/templates`） · [@agentskit/core](./core) · [Tools](../agents/tools) · [Skills](../agents/skills) · [Adapters](../data-layer/adapters)
