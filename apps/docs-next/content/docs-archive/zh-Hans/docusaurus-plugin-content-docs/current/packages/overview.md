---
sidebar_position: 1
title: 软件包概览
description: 全部十四个 AgentsKit npm 包——用途、安装名与规范文档链接。
---

# 软件包概览

`@agentskit/*` 下十四个专注包。按需安装；UI 与 runtime 层共享 **`@agentskit/core`**（core 无第三方依赖）。

:::tip API 参考

完整签名：**[TypeDoc HTML](pathname:///agentskit/api-reference/)**（在 `pnpm --filter @agentskit/docs build` 时生成；本地开发请先运行一次 `pnpm --filter @agentskit/docs docs:api`）。

:::

## 软件包索引

| 软件包 | 作用 | 指南 |
|---------|------|--------|
| [`@agentskit/core`](./core) | 类型、聊天控制器、原语、智能体循环 | [Core](./core) |
| [`@agentskit/react`](../chat-uis/react) | React 钩子 + 无头 UI | [React](../chat-uis/react) |
| [`@agentskit/ink`](../chat-uis/ink) | 终端 UI（Ink） | [Ink](../chat-uis/ink) |
| [`@agentskit/adapters`](../data-layer/adapters) | LLM 适配器 + 嵌入器 | [Adapters](../data-layer/adapters) |
| [`@agentskit/memory`](../data-layer/memory) | 聊天 + 向量后端 | [Memory](../data-layer/memory) |
| [`@agentskit/rag`](../data-layer/rag) | 分块、嵌入、检索 | [RAG](../data-layer/rag) |
| [`@agentskit/runtime`](../agents/runtime) | 无头 ReAct runtime | [Runtime](../agents/runtime) |
| [`@agentskit/tools`](../agents/tools) | 搜索、文件系统、shell 工具 | [Tools](../agents/tools) |
| [`@agentskit/skills`](../agents/skills) | 内置技能定义 | [Skills](../agents/skills) |
| [`@agentskit/observability`](../infrastructure/observability) | 日志 + 追踪观察者 | [Observability](../infrastructure/observability) |
| [`@agentskit/sandbox`](../infrastructure/sandbox) | 沙箱代码执行 | [Sandbox](../infrastructure/sandbox) |
| [`@agentskit/eval`](../infrastructure/eval) | 评估套件 + CI 指标 | [Eval](../infrastructure/eval) |
| [`@agentskit/cli`](../infrastructure/cli) | `agentskit` CLI | [CLI](../infrastructure/cli) |
| [`@agentskit/templates`](./templates) | 脚手架工具、技能、适配器 | [Templates](./templates) |

维护者：**[文档清单](../contributing/package-docs)**。
