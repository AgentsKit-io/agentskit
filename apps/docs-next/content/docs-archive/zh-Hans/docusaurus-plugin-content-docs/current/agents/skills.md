---
sidebar_position: 3
---

# Skills

`@agentskit/skills` 提供五个内置 **`SkillDefinition`**（系统提示 + 元数据）。技能携带 **`tools`** 提示与 **`delegates`** 提示，以便运行时在委派期间知道要合并哪些工具、优先哪些子智能体。

## 何时使用

- 需要**有明确人设**（研究员、编码员、规划员等），又不想手写冗长系统提示。
- 使用 **`composeSkills`** 组合多阶段任务的人设。

自定义技能为普通对象——可使用 [`@agentskit/templates`](../packages/templates) 或在代码中定义 `SkillDefinition`。

## 安装

```bash
npm install @agentskit/skills
```

技能类型来自 [`@agentskit/core`](../packages/core)。

## 公开导出

| 导出 | 作用 |
|--------|------|
| `researcher`, `coder`, `planner`, `critic`, `summarizer` | 内置 `SkillDefinition` 对象 |
| `composeSkills(...skills)` | 合并提示、工具提示与委派 |
| `listSkills()` | 用于发现界面的 `SkillMetadata[]` |

## 使用技能

通过 `skill` 选项将技能传给 `runtime.run()`。技能的 `systemPrompt` 会替换默认系统提示，`skill.tools` 中列出的工具会合并进当前工具集。

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { researcher } from '@agentskit/skills'
import { webSearch } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: [webSearch()],
})

const result = await runtime.run(
  'What are the trade-offs between Redis and Memcached?',
  { skill: researcher },
)
```

## 内置技能

### `researcher`

有条理的网络研究，从多个来源查找、交叉验证并汇总信息。

- **tools 提示：** `['web_search']`
- **delegates：** _（无）_

研究员会将问题拆成子查询、分别搜索、交叉引用来源，最后给出置信度评估。

### `coder`

遵循最佳实践编写简洁、经过测试、可投入生产的代码的软件工程师。

- **tools 提示：** `['read_file', 'write_file', 'list_directory', 'shell']`
- **delegates：** _（无）_

编码员在编写前充分理解需求、处理边界情况，并解释关键设计决策。从不使用 `any` 类型，也不添加未要求的抽象。

### `planner`

将复杂任务拆成步骤、识别依赖并协调专家智能体的战略规划者。

- **tools 提示：** _（无——由委派完成工作）_
- **delegates：** `['researcher', 'coder']`

规划员将目标分解为最小可独立完成步骤，并将每步委派给对应专家。某步失败时会重新规划，而非盲目继续。

### `critic`

从正确性、完整性与质量方面评估工作的建设性评审。

- **tools 提示：** `['read_file']`
- **delegates：** _（无）_

评审员按严重程度（严重 / 重要 / 轻微）归类问题，给出具体修复与理由，并在列出问题前先肯定做得好的部分。

### `summarizer`

在保留细微差别与结构的同时提炼要点的简洁摘要。

- **tools 提示：** _（无）_
- **delegates：** _（无）_

摘要长度随内容长度伸缩：短内容一句话，长内容结构化要点。从不引入原文没有的信息。

## `composeSkills`

将两个或多个技能合并为一个。结果技能会串联所有系统提示（以 `--- name ---` 标题分隔）、对工具提示去重并合并委派列表。

```ts
import { composeSkills, researcher, coder } from '@agentskit/skills'

const fullStackAgent = composeSkills(researcher, coder)

const result = await runtime.run(
  'Research the best TypeScript ORM, then scaffold a basic schema',
  { skill: fullStackAgent },
)
```

组合技能的 `name` 为 `researcher+coder`，`description` 会列出两个组成部分。

```ts
// Throws — at least one skill is required
composeSkills()

// Single skill passthrough — returns the original unchanged
composeSkills(researcher) // === researcher
```

## `listSkills`

枚举所有内置技能及其元数据——适用于构建智能体界面或校验配置。

```ts
import { listSkills } from '@agentskit/skills'

const skills = listSkills()
// [
//   { name: 'researcher', description: '...', tools: ['web_search'], delegates: [] },
//   { name: 'coder',      description: '...', tools: ['read_file', 'write_file', 'list_directory', 'shell'], delegates: [] },
//   { name: 'planner',    description: '...', tools: [], delegates: ['researcher', 'coder'] },
//   { name: 'critic',     description: '...', tools: ['read_file'], delegates: [] },
//   { name: 'summarizer', description: '...', tools: [], delegates: [] },
// ]
```

每一项为 `SkillMetadata` 对象：

```ts
interface SkillMetadata {
  name: string
  description: string
  tools: string[]       // Tool names this skill expects to have available
  delegates: string[]   // Sub-agent names this skill will delegate to
}
```

## 自定义技能

`SkillDefinition` 为普通对象——无需类。

```ts
import type { SkillDefinition } from '@agentskit/core'

export const translator: SkillDefinition = {
  name: 'translator',
  description: 'Translates text between languages accurately and naturally.',
  systemPrompt: `You are a professional translator...`,
  tools: [],
  delegates: [],
}
```

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| Planner 从不委派 | 确保运行时具备匹配工具，并按 [Delegation](./delegation) 配置委派。 |
| 技能工具未被使用 | 在 `createRuntime` 上注册实际的 `ToolDefinition[]`（例如 `webSearch()`）；仅有提示不会安装工具。 |
| 组合提示过长 | 精简源技能或拆成多次运行。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/skills`） · [Runtime](./runtime) · [Delegation](./delegation) · [Tools](./tools) · [@agentskit/core](../packages/core)
