---
sidebar_position: 2
---

# Tools

`@agentskit/tools` 提供用于网络搜索、文件系统访问和 shell 执行的现成 **`ToolDefinition`**。可传给 [`createRuntime`](./runtime) 或 [`useChat`](../hooks/use-chat)。

## 何时使用

- 需要**开箱即用**、已为模型调优 JSON Schema 的工具。
- 通过 `listTools()` 构建**注册表界面**。

若要在自有 npm 包中自定义工具，请参阅 [`@agentskit/templates`](../packages/templates)。

## 安装

```bash
npm install @agentskit/tools
```

依赖 [`@agentskit/core`](../packages/core) 类型（通过 runtime 或 `useChat` 设置引入）。

## 公开导出

| 导出 | 返回 | 说明 |
|--------|---------|--------|
| `webSearch(config?)` | `ToolDefinition` | 搜索提供商：默认 DuckDuckGo，可选 Serper，或自定义 `search` |
| `filesystem(config)` | `ToolDefinition[]` | 限定在 `basePath` 下的 `read_file`、`write_file`、`list_directory` |
| `shell(config)` | `ToolDefinition` | 通过 `allowed` 白名单；超时与输出上限 |
| `listTools()` | `ToolMetadata[]` | 用于控制台与文档的发现 |

## `webSearch`

搜索网络并返回标题、URL 与摘要。

**默认提供商：** DuckDuckGo（无需 API 密钥）。

```ts
import { createRuntime } from '@agentskit/runtime'
import { webSearch } from '@agentskit/tools'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: [webSearch()],
})

const result = await runtime.run('Who won the 2024 Nobel Prize in Physics?')
```

### Serper（Google 结果）

```ts
webSearch({ provider: 'serper', apiKey: process.env.SERPER_API_KEY, maxResults: 8 })
```

### 自带搜索（BYOS）

提供自定义 `search` 函数以使用任意后端：

```ts
webSearch({
  search: async (query) => {
    const hits = await mySearchClient.query(query)
    return hits.map(h => ({ title: h.title, url: h.href, snippet: h.body }))
  },
})
```

### Schema

```json
{
  "name": "web_search",
  "description": "Search the web for information. Returns titles, URLs, and snippets.",
  "schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "The search query" }
    },
    "required": ["query"]
  }
}
```

## `filesystem`

在沙箱化的 `basePath` 内读取、写入并列出文件。模型传入的路径均相对于 `basePath` 解析；任何越界尝试会抛出访问被拒绝错误。

```ts
import { filesystem } from '@agentskit/tools'

const fsTools = filesystem({ basePath: '/tmp/workspace' })
// Returns: [read_file, write_file, list_directory]
```

将数组直接传给运行时：

```ts
const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: fsTools,
})
```

### `read_file`

```json
{
  "name": "read_file",
  "description": "Read the contents of a file. Path is relative to the workspace.",
  "schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "File path relative to workspace" }
    },
    "required": ["path"]
  }
}
```

### `write_file`

```json
{
  "name": "write_file",
  "description": "Write content to a file. Creates the file if it does not exist.",
  "schema": {
    "type": "object",
    "properties": {
      "path":    { "type": "string", "description": "File path relative to workspace" },
      "content": { "type": "string", "description": "Content to write" }
    },
    "required": ["path", "content"]
  }
}
```

### `list_directory`

```json
{
  "name": "list_directory",
  "description": "List files and directories at a path.",
  "schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Directory path relative to workspace (default: root)" }
    }
  }
}
```

## `shell`

在智能体内执行 shell 命令。使用 `allowed` 列表限制模型可运行的命令。

```ts
import { shell } from '@agentskit/tools'

// Allow only git and npm
const shellTool = shell({
  allowed: ['git', 'npm'],
  timeout: 15_000,
})
```

### 配置

| 选项     | 类型       | 默认值      | 说明                                          |
| ---------- | ---------- | ------------ | ---------------------------------------------------- |
| `timeout`  | `number`   | `30_000` ms  | 在此毫秒数后终止进程        |
| `allowed`  | `string[]` | _(any)_      | 命令名白名单（输入的首个词） |
| `maxOutput`| `number`   | `1_000_000`  | 从 stdout + stderr 捕获的最大字节数          |

### Schema

```json
{
  "name": "shell",
  "description": "Execute a shell command. Returns stdout, stderr, and exit code.",
  "schema": {
    "type": "object",
    "properties": {
      "command": { "type": "string", "description": "The shell command to execute" }
    },
    "required": ["command"]
  }
}
```

该工具始终返回以 `[exit code: N]` 或 `[killed: command timed out after Nms]` 结尾的字符串。

## `listTools`

在运行时发现所有可用工具及其元数据——适用于构建控制台或校验技能提示。

```ts
import { listTools } from '@agentskit/tools'

const tools = listTools()
// [
//   { name: 'web_search', description: '...', tags: ['web', 'search'], category: 'retrieval', schema: {...} },
//   { name: 'read_file', ... },
//   { name: 'write_file', ... },
//   { name: 'list_directory', ... },
//   { name: 'shell', ... },
// ]
```

每一项为 `ToolMetadata` 对象：

```ts
interface ToolMetadata {
  name: string
  description: string
  tags: string[]
  category: string
  schema: JSONSchema7
}
```

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| 模型从不调用 `web_search` | 加强描述；确保用户问题能从实时数据中受益。 |
| 文件系统访问被拒绝 | 路径在 `basePath` 下受限；调试时记录解析后的路径。 |
| Shell 被终止 | 达到 `timeout` 或 `maxOutput`；仅在可信环境中放宽限制。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/tools`） · [Runtime](./runtime) · [Skills](./skills) · [@agentskit/core](../packages/core)
