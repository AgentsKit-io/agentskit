---
sidebar_position: 1
---

# useStream

A primitiva fundamental de streaming. Consome qualquer stream assíncrono e devolve estado reativo.

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

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-------|------|-------------|
| `source` | `StreamSource` | Uma fonte de stream de um adaptador ou fonte customizada |
| `options.onChunk` | `(chunk: StreamChunk) => void` | Chamado para cada chunk recebido |
| `options.onComplete` | `(text: string) => void` | Chamado quando o stream termina |
| `options.onError` | `(error: Error) => void` | Chamado em erro de stream |

### Retorno

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `data` | `StreamChunk \| null` | Último chunk recebido |
| `text` | `string` | Texto completo acumulado |
| `status` | `StreamStatus` | `'idle' \| 'streaming' \| 'complete' \| 'error'` |
| `error` | `Error \| null` | Erro se o status for `'error'` |
| `stop` | `() => void` | Aborta o stream |
