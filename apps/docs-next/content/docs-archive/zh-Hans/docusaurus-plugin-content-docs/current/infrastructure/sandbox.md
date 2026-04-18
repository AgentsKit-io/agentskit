---
sidebar_position: 2
---

# Sandbox

`@agentskit/sandbox` 在隔离后端中运行**不受信任的智能体生成代码**。默认集成面向 **E2B**；可替换自定义 `SandboxBackend` 用于本地运行时。

## 何时使用

- 智能体输出**Python 或 JavaScript** 片段，需在超时与资源限制下执行。
- 通过 **`sandboxTool()`** 将执行暴露为 **`ToolDefinition`**（推荐用于 [`createRuntime`](../agents/runtime)）。

## 安装

```bash
npm install @agentskit/sandbox
```

## 创建沙箱

```ts
import { createSandbox } from '@agentskit/sandbox'

const sandbox = createSandbox({
  apiKey: process.env.E2B_API_KEY!,
  timeout: 30_000,
  network: false,
  language: 'javascript',
})
```

传入 **`apiKey`**（E2B）或自定义 **`backend`**。

## 执行代码

```ts
const result = await sandbox.execute('console.log("hello")', {
  language: 'javascript',
  timeout: 10_000,
  network: false,
  memoryLimit: '128MB',
})

console.log(result.stdout, result.stderr, result.exitCode, result.durationMs)
```

### `ExecuteOptions`

| 字段 | 说明 |
|-------|-------------|
| `language` | `javascript` 或 `python` |
| `timeout` | 毫秒 |
| `network` | 后端支持时允许出站网络 |
| `memoryLimit` | 字符串上限（如 `50MB`），在支持时生效 |

## `sandboxTool`（runtime 集成）

`SandboxConfig` 会透传——工具自行管理沙箱生命周期。

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { sandboxTool } from '@agentskit/sandbox'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: [
    sandboxTool({
      apiKey: process.env.E2B_API_KEY!,
      timeout: 45_000,
    }),
  ],
})

await runtime.run('Run javascript: console.log(1+1)')
```

工具以 **`code_execution`** 暴露，参数为 `code` 与可选 `language`（`javascript` | `python`）。

## 安全默认值

- 除非显式启用，否则网络关闭
- 墙钟超时与内存限制字符串会转发给后端
- 原始 `createSandbox()` 句柄优先 **`dispose()`**；`sandboxTool` 通过工具生命周期释放

```ts
await sandbox.dispose()
```

## 自定义后端

实现 `SandboxBackend`：

```ts
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from '@agentskit/sandbox'

const myBackend: SandboxBackend = {
  async execute(code: string, _options: ExecuteOptions): Promise<ExecuteResult> {
    return { stdout: '', stderr: '', exitCode: 0, durationMs: 0 }
  },
  async dispose() {},
}

const sandbox = createSandbox({ backend: myBackend })
```

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| `Sandbox requires either an apiKey` | 传入 E2B 的 `apiKey` 或提供 `backend`。 |
| E2B 配额 / 认证 | 验证 API 密钥与项目限额。 |
| 运行时错误 | 在 `execute` 与工具参数中一致使用 `javascript` 或 `python`。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/sandbox`） · [Observability](./observability) · [Eval](./eval) · [Tools](../agents/tools) · [@agentskit/core](../packages/core)
