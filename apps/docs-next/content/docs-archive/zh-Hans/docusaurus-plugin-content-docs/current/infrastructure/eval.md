---
sidebar_position: 3
---

# Eval

`@agentskit/eval` 对智能体运行结构化评估套件。结果包含准确率、延迟与 token 用量——适用于 CI/CD 门禁与回归追踪。

## 何时使用

- 有稳定的 **`AgentFn`**（字符串入 → 字符串或结构化内容出），需要**回归指标**。
- 根据 **`minAccuracy`** 门禁发布，或跨用例追踪 token 消耗。

## 安装

```bash
npm install @agentskit/eval
```

## 运行评估

```ts
import { runEval } from '@agentskit/eval'

const results = await runEval({
  agent: myAgent,
  suite: mySuite,
})

console.log(results.accuracy)    // 0.92
console.log(results.avgLatencyMs) // 1240
console.log(results.totalTokens)  // 8432
```

## 定义套件

`EvalSuite` 将相关测试用例归组到名称下：

```ts
import type { EvalSuite } from '@agentskit/eval'

const mySuite: EvalSuite = {
  name: 'Customer support — basic queries',
  cases: [
    {
      input: 'What is your return policy?',
      expected: 'returns',  // string: passes if output includes this substring
    },
    {
      input: 'How do I reset my password?',
      expected: (output) => output.toLowerCase().includes('email'),
    },
  ],
}
```

## AgentFn 类型

`runEval` 接受符合 `AgentFn` 的任意函数：

```ts
type AgentFnOutput = string | { content: string; tokenUsage?: TokenUsage }

type AgentFn = (input: string) => Promise<AgentFnOutput>
```

简单情况返回纯字符串。返回带 `tokenUsage` 的对象可将 token 指标纳入报告：

```ts
const agent: AgentFn = async (input) => {
  const result = await myAgent.run(input)
  return {
    content: result.text,
    tokenUsage: {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
    },
  }
}
```

## 期望值

| 期望类型 | 通过条件 |
|--------------|---------------|
| `string` | 输出**包含**期望字符串（区分大小写） |
| `(output: string) => boolean` | 函数返回 `true` |

## EvalTestCase

| 字段 | 类型 | 必填 | 说明 |
|-------|------|----------|-------------|
| `input` | `string` | 是 | 发给智能体的提示 |
| `expected` | `string \| (output: string) => boolean` | 是 | 验收条件 |
| `label` | `string` | 否 | 报告中显示的人类可读名称 |

## 指标

`runEval` 返回带以下字段的 `EvalReport`：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `accuracy` | `number` | 通过用例比例（0–1） |
| `passed` | `number` | 通过数量 |
| `failed` | `number` | 失败数量 |
| `avgLatencyMs` | `number` | 每次智能体调用平均耗时 |
| `totalTokens` | `number \| null` | 输入 + 输出 token 合计（未报告则为 null） |
| `cases` | `CaseResult[]` | 逐用例明细 |

## 错误处理

默认情况下，智能体抛出的错误会被**记录**，该用例记为失败——套件继续运行。单个错误不会中止整次运行。

```ts
// A failing case looks like:
{
  input: 'crash prompt',
  passed: false,
  error: Error('rate limit exceeded'),
  latencyMs: 312,
}
```

传入 `{ throwOnError: true }` 可在首次错误时停止：

```ts
const results = await runEval({ agent, suite, throwOnError: true })
```

## CI/CD 用法

使用退出码控制部署。若准确率低于阈值，`runEval` 会抛出：

```ts
const results = await runEval({
  agent,
  suite,
  minAccuracy: 0.9, // fails the process if accuracy < 90%
})
```

GitHub Actions 步骤示例：

```yaml
- name: Run agent evals
  run: npx tsx evals/run.ts
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

评估套件保持较小（10–50 个用例）以便 CI 快速反馈。较大回归套件可定时运行。

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| 子串匹配不稳定 | 优先使用谓词 `expected`；避免过度具体的引号。 |
| `totalTokens` 为 null | 适配器暴露 usage 时从 `AgentFn` 返回 `tokenUsage`。 |
| CI 超时 | 减小套件规模、模拟网络工具，或对冒烟评估使用更快模型。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/eval`） · [Observability](./observability) · [Sandbox](./sandbox) · [Runtime](../agents/runtime) · [@agentskit/core](../packages/core)
