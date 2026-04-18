---
sidebar_position: 3
---

# Eval

`@agentskit/eval` executa suítes de avaliação estruturadas contra seus agentes. Os resultados incluem precisão, latência e uso de tokens — adequados para gates de CI/CD e acompanhamento de regressão.

## Quando usar

- Você tem um **`AgentFn`** estável (string → string ou conteúdo estruturado) e quer **métricas de regressão**.
- Você bloqueia releases em **`minAccuracy`** ou acompanha gasto de tokens entre casos.

## Instalação

```bash
npm install @agentskit/eval
```

## Executando um eval

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

## Definindo uma suíte

Um `EvalSuite` agrupa casos de teste relacionados sob um nome:

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

## O tipo AgentFn

`runEval` aceita qualquer função compatível com `AgentFn`:

```ts
type AgentFnOutput = string | { content: string; tokenUsage?: TokenUsage }

type AgentFn = (input: string) => Promise<AgentFnOutput>
```

Devolva uma string simples nos casos básicos. Devolva um objeto com `tokenUsage` para incluir métricas de tokens no relatório:

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

| Tipo de expected | Condição de aprovação |
|--------------|---------------|
| `string` | A saída **inclui** a string esperada (sensível a maiúsculas) |
| `(output: string) => boolean` | A função retorna `true` |

## EvalTestCase

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `input` | `string` | Sim | Prompt enviado ao agente |
| `expected` | `string \| (output: string) => boolean` | Sim | Critério de aceitação |
| `label` | `string` | Não | Nome legível mostrado nos relatórios |

## Métricas

`runEval` devolve um `EvalReport` com os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `accuracy` | `number` | Fração de casos aprovados (0–1) |
| `passed` | `number` | Contagem de casos aprovados |
| `failed` | `number` | Contagem de casos reprovados |
| `avgLatencyMs` | `number` | Tempo médio por chamada ao agente |
| `totalTokens` | `number \| null` | Tokens de entrada + saída combinados (null se não informado) |
| `cases` | `CaseResult[]` | Detalhamento por caso |

## Tratamento de erros

Por padrão, erros lançados pelo agente são **registrados** e o caso é marcado como falha — a suíte continua. Um único erro não aborta a execução inteira.

```ts
// A failing case looks like:
{
  input: 'crash prompt',
  passed: false,
  error: Error('rate limit exceeded'),
  latencyMs: 312,
}
```

Passe `{ throwOnError: true }` para parar no primeiro erro:

```ts
const results = await runEval({ agent, suite, throwOnError: true })
```

## Uso em CI/CD

Use o código de saída para bloquear deploys. `runEval` lança se a precisão ficar abaixo do limiar:

```ts
const results = await runEval({
  agent,
  suite,
  minAccuracy: 0.9, // fails the process if accuracy < 90%
})
```

Exemplo de passo no GitHub Actions:

```yaml
- name: Run agent evals
  run: npx tsx evals/run.ts
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Mantenha suítes de eval pequenas (10–50 casos) para feedback rápido na CI. Rode suítes de regressão maiores em agenda.

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| Correspondências por substring instáveis | Prefira funções `expected` predicado; evite aspas excessivamente específicas. |
| `totalTokens` nulo | Devolva `tokenUsage` de `AgentFn` quando o adaptador expõe uso. |
| Timeouts na CI | Reduza o tamanho da suíte, simule ferramentas de rede ou use modelo mais rápido para evals de fumaça. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/eval`) · [Observabilidade](./observability) · [Sandbox](./sandbox) · [Runtime](../agents/runtime) · [@agentskit/core](../packages/core)
