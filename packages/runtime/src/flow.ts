/**
 * Visual-flow → durable DAG. A `FlowDefinition` (typically authored in
 * YAML by the visual editor) is a directed acyclic graph of named nodes;
 * each node names a handler from a `FlowRegistry` and declares which
 * other nodes it depends on. `compileFlow` validates the graph, picks a
 * topological order, and returns a runner that executes every node
 * exactly once per `runId` via `createDurableRunner` — so a partially
 * completed run resumes from the last successful node on retry.
 *
 * The schema is intentionally narrow: ids, handler names, inputs, and
 * `needs`. No conditionals, loops, or expressions. Branching belongs in
 * a handler, not in YAML.
 */

import { createDurableRunner, createInMemoryStepLog, type DurableRunner, type StepLogStore } from './durable'

export interface FlowNode {
  /** Unique within the flow. Used as durable step id. */
  id: string
  /** Display label. Defaults to `id`. */
  name?: string
  /** Handler key — must exist in the `FlowRegistry`. */
  run: string
  /** Static inputs passed to the handler. */
  with?: Record<string, unknown>
  /** Ids of nodes that must finish before this one starts. */
  needs?: string[]
}

export interface FlowDefinition {
  name: string
  version?: number | string
  description?: string
  nodes: FlowNode[]
}

export interface FlowHandlerContext<TInput = unknown> {
  node: FlowNode
  /** Initial input passed to `runFlow`. */
  input: TInput
  /** Outputs of every dependency, keyed by node id. */
  deps: Record<string, unknown>
  /** Static inputs from `node.with`. */
  with: Record<string, unknown>
}

export type FlowHandler<TInput = unknown, TResult = unknown> = (
  ctx: FlowHandlerContext<TInput>,
) => Promise<TResult> | TResult

export type FlowRegistry<TInput = unknown> = Record<string, FlowHandler<TInput>>

export interface FlowValidationIssue {
  code: 'duplicate-id' | 'missing-handler' | 'unknown-dependency' | 'self-dependency' | 'cycle'
  message: string
  nodeId?: string
}

export interface FlowValidationResult {
  ok: boolean
  issues: FlowValidationIssue[]
  /** Topologically ordered ids when the flow is valid. */
  order: string[]
}

export function validateFlow(
  def: FlowDefinition,
  registry?: FlowRegistry,
): FlowValidationResult {
  const issues: FlowValidationIssue[] = []
  const seen = new Set<string>()
  const byId = new Map<string, FlowNode>()
  for (const node of def.nodes) {
    if (seen.has(node.id)) {
      issues.push({ code: 'duplicate-id', message: `duplicate node id "${node.id}"`, nodeId: node.id })
      continue
    }
    seen.add(node.id)
    byId.set(node.id, node)
  }

  for (const node of def.nodes) {
    if (registry && !(node.run in registry)) {
      issues.push({
        code: 'missing-handler',
        message: `node "${node.id}" references unknown handler "${node.run}"`,
        nodeId: node.id,
      })
    }
    for (const dep of node.needs ?? []) {
      if (dep === node.id) {
        issues.push({ code: 'self-dependency', message: `node "${node.id}" depends on itself`, nodeId: node.id })
      } else if (!byId.has(dep)) {
        issues.push({
          code: 'unknown-dependency',
          message: `node "${node.id}" depends on unknown node "${dep}"`,
          nodeId: node.id,
        })
      }
    }
  }

  const order = topoSort(def.nodes)
  if (!order.ok) {
    issues.push({ code: 'cycle', message: `flow has a cycle through: ${order.cycle.join(' → ')}` })
  }

  return { ok: issues.length === 0, issues, order: order.ok ? order.order : [] }
}

function topoSort(
  nodes: FlowNode[],
):
  | { ok: true; order: string[] }
  | { ok: false; cycle: string[] } {
  const indeg = new Map<string, number>()
  const out = new Map<string, string[]>()
  const ids = new Set(nodes.map(n => n.id))
  for (const n of nodes) {
    indeg.set(n.id, (n.needs ?? []).filter(d => ids.has(d) && d !== n.id).length)
    out.set(n.id, [])
  }
  for (const n of nodes) {
    for (const d of n.needs ?? []) {
      if (!ids.has(d) || d === n.id) continue
      out.get(d)!.push(n.id)
    }
  }
  const queue: string[] = []
  for (const [id, count] of indeg) if (count === 0) queue.push(id)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of out.get(id) ?? []) {
      const left = (indeg.get(next) ?? 0) - 1
      indeg.set(next, left)
      if (left === 0) queue.push(next)
    }
  }
  if (order.length === nodes.length) return { ok: true, order }
  const stuck = nodes.filter(n => !order.includes(n.id)).map(n => n.id)
  return { ok: false, cycle: stuck }
}

export interface CompileFlowOptions<TInput = unknown> {
  definition: FlowDefinition
  registry: FlowRegistry<TInput>
}

export interface RunFlowOptions {
  /** Defaults to a fresh `runId` per call. Reuse to resume after a crash. */
  runId?: string
  /** Defaults to an in-memory store. Use `createFileStepLog` for durability. */
  store?: StepLogStore
  /** Forwarded to `createDurableRunner`. */
  maxAttempts?: number
  retryDelayMs?: number
  onEvent?: (event: FlowRunEvent) => void
}

export type FlowRunEvent =
  | { type: 'flow:start'; flow: string; runId: string }
  | { type: 'node:start'; flow: string; runId: string; nodeId: string }
  | { type: 'node:success'; flow: string; runId: string; nodeId: string; result: unknown }
  | { type: 'node:failure'; flow: string; runId: string; nodeId: string; error: string }
  | { type: 'flow:done'; flow: string; runId: string; outputs: Record<string, unknown> }

export interface CompiledFlow<TInput = unknown> {
  definition: FlowDefinition
  order: string[]
  run: (input?: TInput, options?: RunFlowOptions) => Promise<Record<string, unknown>>
}

export function compileFlow<TInput = unknown>(
  options: CompileFlowOptions<TInput>,
): CompiledFlow<TInput> {
  const { definition, registry } = options
  const result = validateFlow(definition, registry as FlowRegistry)
  if (!result.ok) {
    throw new Error(
      `invalid flow "${definition.name}":\n${result.issues.map(i => `  - ${i.message}`).join('\n')}`,
    )
  }
  const byId = new Map(definition.nodes.map(n => [n.id, n] as const))

  const run = async (
    input: TInput = undefined as TInput,
    runOptions: RunFlowOptions = {},
  ): Promise<Record<string, unknown>> => {
    const runId = runOptions.runId ?? `flow-${definition.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const store = runOptions.store ?? createInMemoryStepLog()
    const runner: DurableRunner = createDurableRunner({
      store,
      runId,
      maxAttempts: runOptions.maxAttempts,
      retryDelayMs: runOptions.retryDelayMs,
    })
    runOptions.onEvent?.({ type: 'flow:start', flow: definition.name, runId })

    const outputs: Record<string, unknown> = {}
    for (const id of result.order) {
      const node = byId.get(id)!
      const handler = registry[node.run]
      if (!handler) throw new Error(`handler "${node.run}" missing for node "${id}"`)
      const stepId = `node:${id}`
      runOptions.onEvent?.({ type: 'node:start', flow: definition.name, runId, nodeId: id })
      try {
        const value = await runner.step(stepId, async () => {
          const deps: Record<string, unknown> = {}
          for (const dep of node.needs ?? []) deps[dep] = outputs[dep]
          return handler({
            node,
            input,
            deps,
            with: node.with ?? {},
          })
        }, { name: node.name ?? id })
        outputs[id] = value
        runOptions.onEvent?.({ type: 'node:success', flow: definition.name, runId, nodeId: id, result: value })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        runOptions.onEvent?.({ type: 'node:failure', flow: definition.name, runId, nodeId: id, error: message })
        throw err
      }
    }

    runOptions.onEvent?.({ type: 'flow:done', flow: definition.name, runId, outputs })
    return outputs
  }

  return { definition, order: result.order, run }
}

/**
 * Render a `FlowDefinition` as a Mermaid `flowchart TD`. Used by the
 * visual editor's preview pane and by `agentskit flow render`.
 */
export function flowToMermaid(def: FlowDefinition): string {
  const lines = ['flowchart TD']
  for (const node of def.nodes) {
    const label = node.name ?? node.id
    const safe = label.replace(/"/g, '\\"')
    lines.push(`  ${node.id}["${safe}<br/><i>${node.run}</i>"]`)
  }
  for (const node of def.nodes) {
    for (const dep of node.needs ?? []) {
      lines.push(`  ${dep} --> ${node.id}`)
    }
  }
  return lines.join('\n')
}
