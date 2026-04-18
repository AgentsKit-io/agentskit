---
sidebar_position: 2
---

# Sandbox

`@agentskit/sandbox` ejecuta **código no confiable generado por el agente** en un backend aislado. La integración por defecto apunta a **E2B**; puedes sustituir un `SandboxBackend` personalizado para entornos on-prem.

## Cuándo usarlo

- Los agentes emiten fragmentos **Python o JavaScript** que debes ejecutar con tiempos de espera y límites de recursos.
- Expones la ejecución como **`ToolDefinition`** mediante **`sandboxTool()`** (recomendado para [`createRuntime`](../agents/runtime)).

## Instalación

```bash
npm install @agentskit/sandbox
```

## Crear un sandbox

```ts
import { createSandbox } from '@agentskit/sandbox'

const sandbox = createSandbox({
  apiKey: process.env.E2B_API_KEY!,
  timeout: 30_000,
  network: false,
  language: 'javascript',
})
```

Pasa **`apiKey`** (E2B) o un **`backend`** personalizado.

## Ejecutar código

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

| Campo | Descripción |
|-------|-------------|
| `language` | `javascript` o `python` |
| `timeout` | Milisegundos |
| `network` | Permitir red saliente cuando el backend lo soporte |
| `memoryLimit` | Límite en cadena (p. ej. `50MB`) cuando esté soportado |

## `sandboxTool` (integración con el runtime)

`SandboxConfig` se propaga — la herramienta gestiona su propio ciclo de vida del sandbox.

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

La herramienta se expone como **`code_execution`** con `code` y `language` opcional (`javascript` | `python`).

## Valores de seguridad por defecto

- Red desactivada salvo que se habilite explícitamente
- Tiempo de espera de reloj y cadenas de límite de memoria reenviadas al backend
- Prefiere **`dispose()`** en manejadores crudos de `createSandbox()`; `sandboxTool` libera mediante el ciclo de vida de la herramienta

```ts
await sandbox.dispose()
```

## Backends personalizados

Implementa `SandboxBackend`:

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

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| `Sandbox requires either an apiKey` | Pasa `apiKey` para E2B o proporciona `backend`. |
| Cuota E2B / autenticación | Verifica la clave API y los límites del proyecto. |
| Runtime incorrecto | Usa `javascript` o `python` de forma coherente en `execute` y en los argumentos de la herramienta. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/sandbox`) · [Observability](./observability) · [Eval](./eval) · [Herramientas](../agents/tools) · [@agentskit/core](../packages/core)
