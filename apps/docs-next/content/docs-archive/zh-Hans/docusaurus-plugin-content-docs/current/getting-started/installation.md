---
sidebar_position: 1
---

# 安装

只安装所需内容。每个包都可独立安装。

## 聊天 UI（React）

```bash
npm install @agentskit/react @agentskit/adapters
```

## 聊天 UI（终端）

```bash
npm install @agentskit/ink @agentskit/adapters
```

## 运行智能体

```bash
npm install @agentskit/runtime @agentskit/adapters @agentskit/tools
```

## 完整生态

```bash
npm install @agentskit/core @agentskit/react @agentskit/adapters @agentskit/runtime @agentskit/tools @agentskit/skills @agentskit/memory
```

## 所有软件包

初次接触仓库？**[从这里开始（60 秒）](./read-this-first)** → 然后 **[软件包概览](../packages/overview)**。API 签名：[TypeDoc](pathname:///agentskit/api-reference/)。

| 软件包 | 作用 |
|---------|-------------|
| `@agentskit/core` | 类型、契约、共享原语 |
| `@agentskit/react` | React 钩子 + 无头 UI 组件 |
| `@agentskit/ink` | 终端 UI 组件（Ink） |
| `@agentskit/adapters` | LLM 提供商适配器 + 嵌入器 |
| `@agentskit/cli` | CLI 命令（chat、init、run） |
| `@agentskit/runtime` | 独立智能体运行时（ReAct 循环） |
| `@agentskit/tools` | 内置工具（网络搜索、文件系统、shell） |
| `@agentskit/skills` | 内置技能（研究员、编码员、规划员等） |
| `@agentskit/memory` | 持久化后端（SQLite、Redis、vectra） |
| `@agentskit/rag` | 检索增强生成 |
| `@agentskit/observability` | 日志 + 追踪（控制台、LangSmith、OpenTelemetry） |
| `@agentskit/sandbox` | 安全代码执行（E2B） |
| `@agentskit/eval` | 智能体评估与基准 |
| `@agentskit/templates` | 脚手架工具、技能与适配器 |

## Peer 依赖

React 相关包需要 React 18+：

```bash
npm install react react-dom
```

## 可选：默认主题

```tsx
import '@agentskit/react/theme'
```

使用 CSS 自定义属性——可在不脱离主题的情况下覆盖任意令牌。
