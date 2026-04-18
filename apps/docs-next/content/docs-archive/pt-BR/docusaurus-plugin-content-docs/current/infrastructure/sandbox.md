---
sidebar_position: 2
---

# Sandbox

`@agentskit/sandbox` executa **código gerado pelo agente não confiável** num backend isolado. A integração padrão usa **E2B**; você pode trocar por um `SandboxBackend` customizado para runtimes on-prem.

## Quando usar

- Agentes emitem trechos **Python ou JavaScript** que você precisa executar com timeouts e limites de recurso.
- Você expõe execução como **`ToolDefinition`** via **`sandboxTool()`** (recomendado para [`createRuntime`](../agents/runtime)).

## Instalação

```bash
npm install @agentskit/sandbox
```

## Criando um sandbox

```ts
import { createSandbox } from '@agentskit/sandbox'

const sandbox = createSandbox({
  apiKey: process.env.E2B_API_KEY!,
  timeout: 30_000,
  network: false,
  language: 'javascript',
})
```

Passe **`apiKey`** (E2B) ou um **`backend`** customizado.

## Executando código

```ts
const result = await sandbox.execute('console.log("hello")', {
  language: 'javascript',
  timeout: 10_000,
  network: false,
  memoryLimit: '128MB',
})

console.log(result.stdout, result.stderr, result.exitCode, result.durationMs)
```

### `ExecuteOptions`

| Campo | Descrição |
|-------|-------------|
| `language` | `javascript` ou `python` |
| `timeout` | Milissegundos |
| `network` | Permite rede de saída quando o backend suporta |
| `memoryLimit` | Teto em string (por exemplo `50MB`) quando suportado |

## `sandboxTool` (integração com runtime)

`SandboxConfig` é repassado — a ferramenta gerencia o próprio ciclo de vida do sandbox.

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { sandboxTool } from '@agentskit/sandbox'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: [
    sandboxTool({
      apiKey: process.env.E2B_API_KEY!,
      timeout: 45_000,
    }),
  ],
})

await runtime.run('Run javascript: console.log(1+1)')
```

A ferramenta é exposta como **`code_execution`** com `code` e `language` opcional (`javascript` | `python`).

## Padrões de segurança

- Rede desligada salvo quando explicitamente habilitada
- Timeout de relógio de parede e strings de limite de memória repassadas ao backend
- Prefira **`dispose()`** em handles crus de `createSandbox()`; `sandboxTool` dispõe via ciclo de vida da ferramenta

```ts
await sandbox.dispose()
```

## Backends customizados

Implemente `SandboxBackend`:

```ts
import type { SandboxBackend, ExecuteOptions, ExecuteResult } from '@agentskit/sandbox'

const myBackend: SandboxBackend = {
  async execute(code: string, _options: ExecuteOptions): Promise<ExecuteResult> {
    return { stdout: '', stderr: '', exitCode: 0, durationMs: 0 }
  },
  async dispose() {},
}

const sandbox = createSandbox({ backend: myBackend })
```

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| `Sandbox requires either an apiKey` | Passe `apiKey` para E2B ou forneça `backend`. |
| Cota / auth E2B | Verifique chave de API e limites do projeto. |
| Runtime errado | Use `javascript` ou `python` de forma consistente em `execute` e nos args da ferramenta. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/sandbox`) · [Observabilidade](./observability) · [Eval](./eval) · [Ferramentas](../agents/tools) · [@agentskit/core](../packages/core)
