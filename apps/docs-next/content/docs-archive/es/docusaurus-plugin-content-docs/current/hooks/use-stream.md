---
sidebar_position: 1
---

# useStream

Primitiva fundamental de streaming. Consume cualquier stream asíncrono y devuelve estado reactivo.

## Uso

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

### Parámetros

| Parámetro | Tipo | Descripción |
|-------|------|-------------|
| `source` | `StreamSource` | Origen de stream desde un adaptador o fuente personalizada |
| `options.onChunk` | `(chunk: StreamChunk) => void` | Se llama por cada fragmento recibido |
| `options.onComplete` | `(text: string) => void` | Se llama al terminar el stream |
| `options.onError` | `(error: Error) => void` | Se llama ante error de stream |

### Valor devuelto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data` | `StreamChunk \| null` | Último fragmento recibido |
| `text` | `string` | Texto acumulado completo |
| `status` | `StreamStatus` | `'idle' \| 'streaming' \| 'complete' \| 'error'` |
| `error` | `Error \| null` | Error si el estado es `'error'` |
| `stop` | `() => void` | Abortar el stream |
