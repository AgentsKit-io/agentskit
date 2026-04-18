---
sidebar_position: 2
title: '@agentskit/core'
description: 零依赖基础层——类型、createChatController、流式原语、记忆辅助与智能体循环工具。
---

# `@agentskit/core`

AgentsKit 的共享**契约层**：TypeScript 类型、无头聊天控制器、流辅助，以及 `@agentskit/react`、`@agentskit/ink`、`@agentskit/runtime` 与适配器使用的构建块。**无第三方运行时依赖**——保持本包小而稳定。

## 何时使用

- 在官方类型之上实现**自定义适配器**、工具、记忆或 UI。
- 需要无 React 的 **`createChatController`**（高级集成）。
- 理解整个生态中的**消息、工具调用与流块**。

典型 React 应用通常**不**直接导入 `core`，除类型外——优先 [`useChat`](../hooks/use-chat) 与 [`@agentskit/react`](../chat-uis/react)。

## 安装

```bash
npm install @agentskit/core
```

多数功能包已依赖 `core`；编写库或共享类型时可显式添加。

## 公开导出（概览）

### 聊天控制器与配置

| 导出 | 作用 |
|--------|------|
| `createChatController` | 无头状态机：发送、流、工具、记忆、技能、检索器 |
| 类型：`ChatConfig`、`ChatController`、`ChatState`、`ChatReturn` | 配置与控制器形状 |

控制器合并系统提示、运行检索、分发工具调用、通过 `ChatMemory` 持久化，并暴露 UI 包消费的订阅/更新模式。

### 原语与流

| 导出 | 作用 |
|--------|------|
| `buildMessage` | 构造类型化 `Message` |
| `consumeStream` | 驱动 `StreamSource` → 块 + 完成 |
| `createEventEmitter` | 观察者的内部事件总线 |
| `executeToolCall` | 从 `ToolCall` 负载运行工具 |
| `safeParseArgs` | 安全解析 JSON 工具参数 |
| `createToolLifecycle` | 工具的 `init` / `dispose` |
| `generateId` | 消息与调用的稳定 ID |

### 智能体循环辅助

| 导出 | 作用 |
|--------|------|
| `buildToolMap` | 名称 → `ToolDefinition` 映射 |
| `activateSkills` | 合并技能系统提示与技能提供的工具 |
| `executeSafeTool` | 受保护执行（确认钩子、错误） |

### 记忆与 RAG（轻量）

| 导出 | 作用 |
|--------|------|
| `createInMemoryMemory`、`createLocalStorageMemory`、`createFileMemory` | 测试或演示用的简单捆绑记忆 |
| `serializeMessages` / `deserializeMessages` | 持久化辅助 |
| `createStaticRetriever`、`formatRetrievedDocuments` | 静态上下文的检索器辅助 |

重型后端在 [`@agentskit/memory`](../data-layer/memory)；向量存储与分块在 [`@agentskit/rag`](../data-layer/rag)。

### 配置文件

| 导出 | 作用 |
|--------|------|
| `loadConfig` | 从项目加载 `AgentsKitConfig`（CLI / 工具） |

### 类型（高层）

`AdapterFactory`、`StreamSource`、`StreamChunk`、`Message`、`ToolDefinition`、`ToolCall`、`SkillDefinition`、`ChatMemory`、`Retriever`、`VectorMemory`、`Observer`、`AgentEvent` 及相关类型——完整签名见下方 TypeDoc。

## 示例：在自定义工具中检查类型

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

## 示例：无头控制器（高级）

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

React 应用优先使用 `useChat`——它以钩子包装该模式。

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| 升级后类型错误 | 将所有 `@agentskit/*` 固定到同一 semver；`core` 类型随生态演进。 |
| `createChatController` 与 `useChat` | 控制器与框架无关；React 钩子增加状态绑定与 Strict Mode 安全。 |
| 包体积顾虑 | 摇树未使用导出；避免在客户端包中导入仅服务端工具。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](./overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/core`） · [React](../chat-uis/react) · [Ink](../chat-uis/ink) · [Adapters](../data-layer/adapters) · [Runtime](../agents/runtime) · [Tools](../agents/tools) · [Skills](../agents/skills) · [useChat](../hooks/use-chat) · [useStream](../hooks/use-stream) · [useReactive](../hooks/use-reactive)
