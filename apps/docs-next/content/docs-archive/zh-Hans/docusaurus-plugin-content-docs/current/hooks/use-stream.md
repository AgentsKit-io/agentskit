---
sidebar_position: 1
---

# useStream

基础流式原语。消费任意异步流并返回响应式状态。

## 用法

```tsx
import { useStream } from '@agentskit/react'

function StreamViewer({ source }) {
  const { text, status, error, stop } = useStream(source)

  return (
    <div>
      <p>{text}</p>
      {status === 'streaming' && <button onClick={stop}>Stop</button>}
      {status === 'error' && <p>Error: {error.message}</p>}
    </div>
  )
}
```

## API

```ts
const { data, text, status, error, stop } = useStream(source, options?)
```

### 参数

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `source` | `StreamSource` | 来自适配器或自定义源的流源 |
| `options.onChunk` | `(chunk: StreamChunk) => void` | 每收到一块时调用 |
| `options.onComplete` | `(text: string) => void` | 流结束时调用 |
| `options.onError` | `(error: Error) => void` | 流出错时调用 |

### 返回值

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `data` | `StreamChunk \| null` | 最新收到的块 |
| `text` | `string` | 累积的完整文本 |
| `status` | `StreamStatus` | `'idle' \| 'streaming' \| 'complete' \| 'error'` |
| `error` | `Error \| null` | 状态为 `'error'` 时的错误 |
| `stop` | `() => void` | 中止流 |
