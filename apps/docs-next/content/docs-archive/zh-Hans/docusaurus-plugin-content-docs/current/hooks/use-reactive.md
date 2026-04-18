---
sidebar_position: 2
---

# useReactive

基于代理的细粒度响应式状态。变更仅触发读取了被改属性的组件重渲染。

## 用法

```tsx
import { useReactive } from '@agentskit/react'

function Counter() {
  const state = useReactive({ count: 0 })

  return (
    <button onClick={() => state.count++}>
      Count: {state.count}
    </button>
  )
}
```

## API

```ts
const state = useReactive(initialState)
```

### 参数

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `initialState` | `Record<string, unknown>` | 初始状态对象 |

### 返回值

状态对象的代理版本。直接读写属性——写入会触发重渲染。

## 工作原理

内部使用 `useSyncExternalStore`，在基于代理的追踪与 React 协调模型之间桥接。代理拦截属性写入并通知 React 重渲染。
