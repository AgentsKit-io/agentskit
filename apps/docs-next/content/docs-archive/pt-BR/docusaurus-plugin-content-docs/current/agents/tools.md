---
sidebar_position: 2
---

# Ferramentas

`@agentskit/tools` fornece valores **`ToolDefinition`** prontos para busca na web, acesso ao sistema de arquivos e execução de shell. Passe-os a [`createRuntime`](./runtime) ou [`useChat`](../hooks/use-chat).

## Quando usar

- Você quer ferramentas **com bateria inclusa** com JSON Schema já afinado para modelos.
- Você monta uma **UI de registro** via `listTools()`.

Para ferramentas customizadas no seu próprio pacote npm, veja [`@agentskit/templates`](../packages/templates).

## Instalação

```bash
npm install @agentskit/tools
```

Depende dos tipos de [`@agentskit/core`](../packages/core) (via seu runtime ou configuração `useChat`).

## Exportações públicas

| Exportação | Retorna | Observações |
|--------|---------|--------|
| `webSearch(config?)` | `ToolDefinition` | Provedores de busca: DuckDuckGo padrão, Serper opcional ou `search` customizado |
| `filesystem(config)` | `ToolDefinition[]` | `read_file`, `write_file`, `list_directory` limitados a `basePath` |
| `shell(config)` | `ToolDefinition` | Lista branca via `allowed`; timeout e limites de saída |
| `listTools()` | `ToolMetadata[]` | Descoberta para dashboards e docs |

## `webSearch`

Busca na web e devolve títulos, URLs e trechos.

**Provedor padrão:** DuckDuckGo (sem chave de API).

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

### Serper (resultados Google)

```ts
webSearch({ provider: 'serper', apiKey: process.env.SERPER_API_KEY, maxResults: 8 })
```

### Traga sua própria busca (BYOS)

Forneça uma função `search` customizada para usar qualquer backend:

```ts
webSearch({
  search: async (query) => {
    const hits = await mySearchClient.query(query)
    return hits.map(h => ({ title: h.title, url: h.href, snippet: h.body }))
  },
})
```

### Schema

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

Lê, grava e lista arquivos dentro de um `basePath` em sandbox. Todos os caminhos passados pelo modelo são resolvidos em relação a `basePath`; qualquer tentativa de escapar lança erro de acesso negado.

```ts
import { filesystem } from '@agentskit/tools'

const fsTools = filesystem({ basePath: '/tmp/workspace' })
// Returns: [read_file, write_file, list_directory]
```

Passe o array direto ao runtime:

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

Executa comandos de shell de dentro do agente. Use a lista `allowed` para restringir quais comandos o modelo pode rodar.

```ts
import { shell } from '@agentskit/tools'

// Allow only git and npm
const shellTool = shell({
  allowed: ['git', 'npm'],
  timeout: 15_000,
})
```

### Configuração

| Opção     | Tipo       | Padrão      | Descrição                                          |
| ---------- | ---------- | ------------ | ---------------------------------------------------- |
| `timeout`  | `number`   | `30_000` ms  | Encerra o processo após tantos milissegundos        |
| `allowed`  | `string[]` | _(any)_      | Lista branca de nomes de comando (primeira palavra da entrada) |
| `maxOutput`| `number`   | `1_000_000`  | Máximo de bytes capturados de stdout + stderr          |

### Schema

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

A ferramenta sempre devolve uma string terminando com `[exit code: N]` ou `[killed: command timed out after Nms]`.

## `listTools`

Descubra todas as ferramentas disponíveis e seus metadados em runtime — útil para dashboards ou validar dicas de skills.

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

Cada entrada é um objeto `ToolMetadata`:

```ts
interface ToolMetadata {
  name: string
  description: string
  tags: string[]
  category: string
  schema: JSONSchema7
}
```

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| O modelo nunca chama `web_search` | Reforce a descrição; garanta que a pergunta do usuário se beneficie de dados ao vivo. |
| Acesso ao sistema de arquivos negado | Caminhos ficam presos a `basePath`; registre caminhos resolvidos ao depurar. |
| Shell morto | Atingiu `timeout` ou `maxOutput`; amplie limites só em ambientes confiáveis. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/tools`) · [Runtime](./runtime) · [Skills](./skills) · [@agentskit/core](../packages/core)
