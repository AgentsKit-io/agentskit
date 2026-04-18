---
sidebar_position: 3
---

# Eval

`@agentskit/eval` ejecuta suites de evaluación estructuradas contra tus agentes. Los resultados incluyen precisión, latencia y uso de tokens — adecuados para puertas en CI/CD y seguimiento de regresiones.

## Cuándo usarlo

- Tienes un **`AgentFn`** estable (cadena de entrada → cadena o contenido estructurado de salida) y quieres **métricas de regresión**.
- Bloqueas lanzamientos con **`minAccuracy`** o sigues el gasto de tokens entre casos.

## Instalación

```bash
npm install @agentskit/eval
```

## Ejecutar un eval

```ts
import { runEval } from '@agentskit/eval'

const results = await runEval({
  agent: myAgent,
  suite: mySuite,
})

console.log(results.accuracy)    // 0.92
console.log(results.avgLatencyMs) // 1240
console.log(results.totalTokens)  // 8432
```

## Definir una suite

Un `EvalSuite` agrupa casos de prueba relacionados bajo un nombre:

```ts
import type { EvalSuite } from '@agentskit/eval'

const mySuite: EvalSuite = {
  name: 'Customer support — basic queries',
  cases: [
    {
      input: 'What is your return policy?',
      expected: 'returns',  // string: passes if output includes this substring
    },
    {
      input: 'How do I reset my password?',
      expected: (output) => output.toLowerCase().includes('email'),
    },
  ],
}
```

## El tipo AgentFn

`runEval` acepta cualquier función que coincida con `AgentFn`:

```ts
type AgentFnOutput = string | { content: string; tokenUsage?: TokenUsage }

type AgentFn = (input: string) => Promise<AgentFnOutput>
```

Devuelve una cadena plana para casos simples. Devuelve un objeto con `tokenUsage` para incluir métricas de tokens en el informe:

```ts
const agent: AgentFn = async (input) => {
  const result = await myAgent.run(input)
  return {
    content: result.text,
    tokenUsage: {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
    },
  }
}
```

## Valores esperados

| Tipo de expected | Condición de aprobación |
|--------------|---------------|
| `string` | La salida **incluye** la cadena esperada (sensible a mayúsculas) |
| `(output: string) => boolean` | La función devuelve `true` |

## EvalTestCase

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `input` | `string` | Sí | Prompt enviado al agente |
| `expected` | `string \| (output: string) => boolean` | Sí | Criterio de aceptación |
| `label` | `string` | No | Nombre legible mostrado en informes |

## Métricas

`runEval` devuelve un `EvalReport` con los siguientes campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `accuracy` | `number` | Fracción de casos aprobados (0–1) |
| `passed` | `number` | Número de casos aprobados |
| `failed` | `number` | Número de casos fallidos |
| `avgLatencyMs` | `number` | Tiempo medio por llamada al agente |
| `totalTokens` | `number \| null` | Tokens de entrada + salida combinados (null si no se informa) |
| `cases` | `CaseResult[]` | Desglose por caso |

## Manejo de errores

Por defecto, los errores lanzados por el agente se **registran** y el caso se marca como fallido — la suite sigue ejecutándose. Un solo error no aborta toda la ejecución.

```ts
// A failing case looks like:
{
  input: 'crash prompt',
  passed: false,
  error: Error('rate limit exceeded'),
  latencyMs: 312,
}
```

Pasa `{ throwOnError: true }` para detenerte en el primer error:

```ts
const results = await runEval({ agent, suite, throwOnError: true })
```

## Uso en CI/CD

Usa el código de salida para bloquear despliegues. `runEval` lanza si la precisión cae por debajo de un umbral:

```ts
const results = await runEval({
  agent,
  suite,
  minAccuracy: 0.9, // fails the process if accuracy < 90%
})
```

Ejemplo de paso en GitHub Actions:

```yaml
- name: Run agent evals
  run: npx tsx evals/run.ts
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Mantén las suites de eval pequeñas (10–50 casos) para feedback rápido en CI. Ejecuta suites de regresión más grandes según un calendario.

## Solución de problemas

| Problema | Mitigación |
|-------|------------|
| Coincidencias por subcadena inestables | Prefiere funciones `expected` predicado; evita comillas demasiado específicas. |
| `totalTokens` null | Devuelve `tokenUsage` desde `AgentFn` cuando el adaptador expone uso. |
| Tiempos de espera en CI | Reduce el tamaño de la suite, simula herramientas de red o usa un modelo más rápido para evals de humo. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/eval`) · [Observability](./observability) · [Sandbox](./sandbox) · [Runtime](../agents/runtime) · [@agentskit/core](../packages/core)
