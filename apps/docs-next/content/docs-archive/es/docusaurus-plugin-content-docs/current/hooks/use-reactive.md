---
sidebar_position: 2
---

# useReactive

Estado reactivo de grano fino basado en proxy. Las mutaciones disparan re-renderizados solo en los componentes que leen las propiedades cambiadas.

## Uso

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

### Parámetros

| Parámetro | Tipo | Descripción |
|-------|------|-------------|
| `initialState` | `Record<string, unknown>` | Objeto de estado inicial |

### Valor devuelto

Una versión con proxy del objeto de estado. Lee y escribe propiedades directamente — las escrituras disparan re-renderizados.

## Cómo funciona

Internamente usa `useSyncExternalStore` para enlazar el seguimiento basado en proxy con el modelo de reconciliación de React. El proxy intercepta las escrituras de propiedades y notifica a React para volver a renderizar.
