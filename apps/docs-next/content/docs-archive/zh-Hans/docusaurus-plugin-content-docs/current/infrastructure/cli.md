---
sidebar_position: 4
---

# CLI

`@agentskit/cli` 提供终端命令：**交互式聊天**（Ink）、**一次性智能体运行**（无界面 runtime）以及**入门项目**。通过 [`loadConfig`](../packages/core) 从 **`.agentskit.config.json`** 读取可选项目配置。

## 何时使用

- 需要**快速终端聊天**，无需自建 Ink 应用。
- 用 `agentskit run <task>` 及标志运行**自动化或 CI** 任务（无需单独脚本文件）。
- 用 `agentskit init` 搭建 **React 或 Ink** 入门项目。

## 安装

```bash
npm install -g @agentskit/cli
# or
npx @agentskit/cli --help
```

## 配置文件（可选）

若存在 `.agentskit.config.json`，会合并到默认值（除非使用 `--no-config`）。[`loadConfig`](../packages/core) 从当前工作目录解析。

典型字段包括 chat 与 run 命令的默认 `provider` 和 `model`。

## `agentskit chat`

使用 `@agentskit/ink` 的交互式终端 UI。

```bash
agentskit chat [options]
```

| 选项 | 说明 |
|--------|-------------|
| `--provider <name>` | `demo`、`anthropic`、`openai`、…（默认：`demo`） |
| `--model <id>` | 提供商的模型 id |
| `--api-key <key>` | 覆盖基于环境的 API 密钥 |
| `--base-url <url>` | 自定义 API 基 URL |
| `--system <prompt>` | 系统提示 |
| `--memory <path>` | 基于文件的历史路径（默认：`.agentskit-history.json`） |
| `--memory-backend <backend>` | `file`（默认）或 `sqlite` |
| `--tools <list>` | 逗号分隔：`web_search`、`filesystem`、`shell` |
| `--skill <list>` | 逗号分隔的内置技能名（见 [@agentskit/skills](../agents/skills)） |
| `--no-config` | 跳过 `.agentskit.config.json` |

API 密钥：`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 等，取决于提供商。

```bash
agentskit chat --provider anthropic --model claude-sonnet-4-6 --tools web_search
```

## `agentskit run`

通过 [`createRuntime`](../agents/runtime) 执行**单次任务**，并将最终助手文本打印到 stdout。

```bash
agentskit run <task> [options]
agentskit run --task "Summarize this" [options]
```

| 选项 | 说明 |
|--------|-------------|
| `--task <text>` | 若未将任务作为第一个位置参数传入 |
| `--provider`、`--model`、`--api-key`、`--base-url` | 与 chat 相同 |
| `--tools <list>` | 逗号分隔工具 |
| `--skill <name>` | 单个技能 |
| `--skills <list>` | 逗号分隔技能（组合）；与 `--skill` **互斥** |
| `--memory <path>` | 使用 file/sqlite 记忆时的持久化路径 |
| `--memory-backend <backend>` | `file`（默认）或 `sqlite` |
| `--system-prompt <text>` | 覆盖默认系统提示 |
| `--max-steps <n>` | ReAct 上限（默认：`10`） |
| `--verbose` | 将智能体事件记录到 stderr |
| `--pretty` | 富 Ink 进度 UI |
| `--no-config` | 跳过配置文件 |

```bash
agentskit run "What is 2+2?" --provider openai --model gpt-4o --verbose
```

当前 CLI **没有** `agentskit run ./script.ts` 模式——请用 `node`/`tsx` 调用自有 TypeScript 入口，并配合 [`createRuntime`](../agents/runtime)。

## `agentskit init`

脚手架入门项目。

```bash
agentskit init [options]
```

| 选项 | 默认值 | 说明 |
|--------|---------|-------------|
| `--template <react\|ink>` | `react` | 入门技术栈 |
| `--dir <path>` | `agentskit-starter` | 输出目录（相对 cwd 解析） |

```bash
agentskit init --template react --dir my-chat
cd my-chat && npm install && npm run dev
```

## 环境变量

| 变量 | 用途 |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Anthropic |
| `OPENAI_API_KEY` | OpenAI |
| `REDIS_URL` | 在自定义代码中接入 Redis 记忆时（非 CLI 默认文件记忆） |

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| `task is required` | 在 `run` 后传入字符串或使用 `--task`。 |
| 同时设置 `--skill` 与 `--skills` | CLI 报错退出——只使用其一。 |
| 提供商认证错误 | 导出正确的 `*_API_KEY` 或传入 `--api-key`。 |
| 默认值不对 | 检查 `.agentskit.config.json` 或使用 `--no-config`。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/cli`） · [快速开始](../getting-started/quick-start) · [Ink](../chat-uis/ink) · [Runtime](../agents/runtime) · [Eval](./eval)
