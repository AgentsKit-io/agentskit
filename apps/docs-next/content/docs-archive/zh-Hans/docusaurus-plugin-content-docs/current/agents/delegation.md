---
sidebar_position: 4
---

# 多智能体委派

通过定向委派，由父智能体协调多个专家智能体。

## 安装

```bash
npm install @agentskit/runtime @agentskit/adapters @agentskit/skills @agentskit/tools
```

## 快速开始

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

## 工作原理

配置 `delegates` 时，运行时会自动生成名为 `delegate_<name>` 的工具。父级 LLM 像调用其他工具一样调用它们。每个子智能体运行各自的 ReAct 循环并返回结果。

## DelegateConfig

```ts
interface DelegateConfig {
  skill: SkillDefinition     // required — the child's behavior
  tools?: ToolDefinition[]   // tools available to the child
  adapter?: AdapterFactory   // optional — different LLM per child
  maxSteps?: number          // default: 5
}
```

## 共享上下文

```ts
const ctx = createSharedContext({ project: 'landing-page' })

runtime.run('Build it', { delegates: { ... }, sharedContext: ctx })

// Parent reads/writes
ctx.set('key', 'value')
ctx.get('key')

// Children get read-only view — set() is not available
```

## 子智能体隔离

- **全新消息** — 不含父级历史
- **继承观察者** — 事件可在日志中可见
- **无记忆** — 不共享父级记忆
- **深度限制** — `maxDelegationDepth` 默认为 3

## 事件

```
[10:00:01] => delegate:start researcher [depth=1] "Research quantum computing"
[10:00:03] <= delegate:end researcher (2100ms) "Found 3 papers on..."
```

## 相关

- [Runtime](/docs/agents/runtime) — ReAct 循环
- [Skills](/docs/agents/skills) — 行为提示
- [Observability](/docs/infrastructure/observability) — 追踪事件
