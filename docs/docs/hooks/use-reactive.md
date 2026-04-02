---
sidebar_position: 2
---

# useReactive

Proxy-based fine-grained reactive state. Mutations trigger re-renders only for components that read the changed properties.

## Usage

```tsx
import { useReactive } from 'react-arrow'

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

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `initialState` | `Record<string, unknown>` | Initial state object |

### Returns

A proxied version of the state object. Read and write properties directly — writes trigger re-renders.

## How It Works

Internally uses `useSyncExternalStore` to bridge proxy-based tracking with React's reconciliation model. The proxy intercepts property writes and notifies React to re-render.
