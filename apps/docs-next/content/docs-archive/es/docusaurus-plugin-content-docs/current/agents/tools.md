---
sidebar_position: 2
---

# Herramientas

`@agentskit/tools` proporciona valores **`ToolDefinition`** listos para búsqueda web, acceso al sistema de archivos y ejecución de shell. Pásalos a [`createRuntime`](./runtime) o [`useChat`](../hooks/use-chat).

## Cuándo usarlo

- Quieres herramientas **con baterías incluidas** con JSON Schema ya afinado para los modelos.
- Construyes una **UI de registro** mediante `listTools()`.

Para herramientas personalizadas en tu propio paquete npm, véase [`@agentskit/templates`](../packages/templates).

## Instalación

```bash
npm install @agentskit/tools
```

Depende de los tipos de [`@agentskit/core`](../packages/core) (a través de tu runtime o la configuración de `useChat`).

## Exportaciones públicas

| Exportación | Devuelve | Notas |
|--------|---------|--------|
| `webSearch(config?)` | `ToolDefinition` | Proveedores de búsqueda: DuckDuckGo por defecto, Serper opcional o `search` personalizado |
| `filesystem(config)` | `ToolDefinition[]` | `read_file`, `write_file`, `list_directory` acotados a `basePath` |
| `shell(config)` | `ToolDefinition` | Lista blanca con `allowed`; tiempo de espera y límites de salida |
| `listTools()` | `ToolMetadata[]` | Descubrimiento para paneles y documentación |

## `webSearch`

Busca en la web y devuelve títulos, URL y fragmentos.

**Proveedor por defecto:** DuckDuckGo (no requiere clave API).

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

### Serper (resultados de Google)

```ts
webSearch({ provider: 'serper', apiKey: process.env.SERPER_API_KEY, maxResults: 8 })
```

### Trae tu propia búsqueda (BYOS)

Proporciona una función `search` personalizada para usar cualquier backend:

```ts
webSearch({
  search: async (query) => {
    const hits = await mySearchClient.query(query)
    return hits.map(h => ({ title: h.title, url: h.href, snippet: h.body }))
  },
})
```

### Esquema

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

Lee, escribe y lista archivos dentro de un `basePath` aislado. Todas las rutas que pasa el modelo se resuelven relativas a `basePath`; cualquier intento de salir lanza un error de acceso denegado.

```ts
import { filesystem } from '@agentskit/tools'

const fsTools = filesystem({ basePath: '/tmp/workspace' })
// Returns: [read_file, write_file, list_directory]
```

Pasa el array directamente al runtime:

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

Ejecuta comandos de shell desde el agente. Usa la lista `allowed` para restringir qué comandos puede ejecutar el modelo.

```ts
import { shell } from '@agentskit/tools'

// Allow only git and npm
const shellTool = shell({
  allowed: ['git', 'npm'],
  timeout: 15_000,
})
```

### Configuración

| Opción     | Tipo       | Por defecto      | Descripción                                          |
| ---------- | ---------- | ------------ | ---------------------------------------------------- |
| `timeout`  | `number`   | `30_000` ms  | Termina el proceso tras tantos milisegundos        |
| `allowed`  | `string[]` | _(cualquiera)_      | Lista blanca de nombres de comando (primera palabra de la entrada) |
| `maxOutput`| `number`   | `1_000_000`  | Máximo de bytes capturados de stdout + stderr          |

### Esquema

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

La herramienta siempre devuelve una cadena que termina con `[exit code: N]` o `[killed: command timed out after Nms]`.

## `listTools`

Descubre todas las herramientas disponibles y su metadatos en tiempo de ejecución — útil para construir paneles o validar pistas de skills.

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

Cada entrada es un objeto `ToolMetadata`:

```ts
interface ToolMetadata {
  name: string
  description: string
  tags: string[]
  category: string
  schema: JSONSchema7
}
```

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| El modelo nunca llama a `web_search` | Refuerza la descripción; asegúrate de que la pregunta del usuario se beneficie de datos en vivo. |
| Acceso al sistema de archivos denegado | Las rutas están enjauladas en `basePath`; registra rutas resueltas al depurar. |
| Shell terminado | Se alcanzó `timeout` o `maxOutput`; amplía límites solo en entornos de confianza. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/tools`) · [Runtime](./runtime) · [Skills](./skills) · [@agentskit/core](../packages/core)
