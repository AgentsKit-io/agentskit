import { camelCase, pascalCase } from './utils'

/**
 * Scaffold for a flow handler registry. The author writes a YAML
 * `FlowDefinition` (see `/docs/agents/flow`) and pairs it with a
 * registry module that this skeleton produces. `compileFlow` consumes
 * both and returns a durable runner.
 */
export function generateFlowSource(name: string): string {
  return `import type { FlowRegistry } from '@agentskit/runtime'

/**
 * Handler registry for the \`${name}\` flow. Each key matches the
 * \`run:\` field on a node in the flow's YAML / object definition.
 *
 * Each handler receives \`{ node, input, deps, with }\`:
 * - \`node\`   the FlowNode metadata (id, name, run, with, needs).
 * - \`input\`  the value passed to compiled.run(input).
 * - \`deps\`   outputs of upstream nodes, keyed by node id.
 * - \`with\`   static inputs from the YAML \`with:\` block.
 */
export const ${camelCase(name)}Registry: FlowRegistry = {
  // TODO: replace these stubs with real handlers.
  'http.get': async ({ with: w }) => {
    const url = String(w.url ?? '')
    const response = await fetch(url)
    if (!response.ok) throw new Error(\`http.get \${response.status}: \${url}\`)
    return await response.text()
  },

  'json.parse': ({ deps }) => {
    const raw = String(deps[Object.keys(deps)[0] ?? ''] ?? '')
    return JSON.parse(raw)
  },

  // Add more handlers as your flow's nodes need them.
}

export default ${camelCase(name)}Registry
`
}

export function generateFlowYaml(name: string): string {
  return `# ${pascalCase(name)} — visual flow.
# Documented at https://www.agentskit.io/docs/agents/flow

name: ${name}
version: 1
description: TODO — what does this flow do?

nodes:
  - id: fetch
    name: Fetch the source
    run: http.get
    with:
      url: https://example.com/data.json

  - id: parse
    name: Parse JSON
    run: json.parse
    needs: [fetch]
`
}

export function generateFlowReadme(name: string): string {
  return `# ${name}

A visual flow + handler registry for AgentsKit.

## Run

\`\`\`bash
agentskit flow validate flow.yaml --registry ./dist/index.js
agentskit flow render   flow.yaml > flow.mmd
agentskit flow run      flow.yaml --registry ./dist/index.js \\\\
  --store .agentskit/flow.jsonl --run-id $(date +%s)
\`\`\`

## Layout

- \`flow.yaml\` — the visual graph.
- \`src/index.ts\` — handler registry. Each key matches the \`run:\`
  field on a node.

## Programmatic use

\`\`\`ts
import { compileFlow } from '@agentskit/runtime'
import { parse } from 'yaml'
import registry from './src/index'

const definition = parse(await readFile('./flow.yaml', 'utf8'))
const compiled = compileFlow({ definition, registry })
const outputs = await compiled.run()
\`\`\`

See [Visual flows](https://www.agentskit.io/docs/agents/flow).
`
}

export function generateFlowTest(name: string): string {
  return `import { describe, expect, it } from 'vitest'
import { compileFlow } from '@agentskit/runtime'
import registry from '../src/index'

describe('${name} registry', () => {
  it('exposes a handler for every node referenced in flow.yaml', () => {
    expect(typeof registry).toBe('object')
    // The registry is consumed by compileFlow at run time. This test
    // just guards against accidental "{}" exports during refactors.
    expect(Object.keys(registry).length).toBeGreaterThan(0)
  })

  it('compiles a minimal flow against the registry', () => {
    expect(() =>
      compileFlow({
        definition: {
          name: 'smoke',
          nodes: Object.keys(registry).slice(0, 1).map(run => ({ id: 'a', run })),
        },
        registry,
      }),
    ).not.toThrow()
  })
})
`
}
