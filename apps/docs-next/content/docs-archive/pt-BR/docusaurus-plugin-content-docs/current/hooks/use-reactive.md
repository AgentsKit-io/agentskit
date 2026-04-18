---
sidebar_position: 2
---

# useReactive

Estado reativo fino baseado em proxy. Mutações disparam re-renderizações só nos componentes que leem as propriedades alteradas.

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

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-------|------|-------------|
| `initialState` | `Record<string, unknown>` | Objeto de estado inicial |

### Retorno

Uma versão com proxy do objeto de estado. Leia e escreva propriedades diretamente — escritas disparam re-renderizações.

## Como funciona

Internamente usa `useSyncExternalStore` para ligar o rastreamento por proxy ao modelo de reconciliação do React. O proxy intercepta escritas de propriedade e notifica o React para re-renderizar.
