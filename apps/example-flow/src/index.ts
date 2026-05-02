/**
 * apps/example-flow — demonstrates `compileFlow` from `@agentskit/runtime`.
 *
 * Reads `flow.yaml`, compiles it against a `FlowRegistry`, runs the
 * resulting DAG with a JSONL durable step log, and prints the rendered
 * markdown. Stop the process mid-run, re-run, and the durable log
 * short-circuits the work that already finished.
 *
 * Usage:
 *   pnpm --filter @agentskit/example-flow dev
 *   pnpm --filter @agentskit/example-flow dev -- --reset   # drop log
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parse } from 'yaml'
import {
  compileFlow,
  createFileStepLog,
  type FlowDefinition,
  type FlowRegistry,
} from '@agentskit/runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const FLOW_PATH = resolve(repoRoot, 'flow.yaml')
const STORE_PATH = resolve(repoRoot, '.agentskit/flow.jsonl')

type StarsArgs = { owner: string; repo: string }
type StarsResult = { owner: string; repo: string; stars: number }

const registry: FlowRegistry = {
  'github.stars': async ({ with: w }) => {
    const args = w as StarsArgs
    const url = `https://api.github.com/repos/${args.owner}/${args.repo}`
    const response = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'agentskit-example-flow',
        ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`github ${response.status} for ${url}: ${body.slice(0, 200)}`)
    }
    const json = (await response.json()) as { stargazers_count?: number }
    const result: StarsResult = {
      owner: args.owner,
      repo: args.repo,
      stars: typeof json.stargazers_count === 'number' ? json.stargazers_count : 0,
    }
    process.stderr.write(`  ★ ${args.owner}/${args.repo} → ${result.stars.toLocaleString()}\n`)
    return result
  },

  'math.sum': ({ deps }) => {
    let total = 0
    for (const value of Object.values(deps)) {
      if (value && typeof value === 'object' && 'stars' in value) {
        total += (value as { stars: number }).stars
      }
    }
    return total
  },

  'render.markdown': ({ deps }) => {
    const lines: string[] = ['# Stargazers digest', '']
    for (const [id, value] of Object.entries(deps)) {
      if (!value || typeof value !== 'object' || !('stars' in value)) continue
      const r = value as StarsResult
      lines.push(`- **${r.owner}/${r.repo}** — ${r.stars.toLocaleString()} ★ (node \`${id}\`)`)
    }
    const total = Object.values(deps).find(v => typeof v === 'number') as number | undefined
    if (typeof total === 'number') {
      lines.push('', `_Total across the listed repos: **${total.toLocaleString()}** ★_`)
    }
    return lines.join('\n')
  },
}

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset')
  const yamlSource = await readFile(FLOW_PATH, 'utf8')
  const definition = parse(yamlSource) as FlowDefinition

  const store = await createFileStepLog(STORE_PATH)
  const compiled = compileFlow({ definition, registry })

  const runId = process.env.RUN_ID ?? 'demo-run'
  if (reset) await store.clear?.(runId)

  process.stderr.write(`▸ flow=${definition.name} runId=${runId} order=${compiled.order.join(' → ')}\n`)
  process.stderr.write(`  store=${STORE_PATH}${reset ? ' (cleared)' : ''}\n\n`)

  const t0 = Date.now()
  const outputs = await compiled.run(undefined, {
    runId,
    store,
    onEvent: event => {
      if (event.type === 'node:start') process.stderr.write(`▸ ${event.nodeId} start\n`)
      if (event.type === 'node:success') process.stderr.write(`✓ ${event.nodeId} done\n`)
      if (event.type === 'node:failure') process.stderr.write(`✗ ${event.nodeId}: ${event.error}\n`)
    },
  })
  const elapsed = Date.now() - t0

  process.stderr.write(`\n— done in ${elapsed}ms —\n\n`)
  process.stdout.write(`${outputs['render'] as string}\n`)
}

main().catch(err => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
