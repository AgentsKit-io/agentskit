/** Runtime topology event mirrored here to avoid an observability-to-runtime dependency cycle. */
export interface TopologyLogEvent {
  topology: string
  phase: 'dispatch' | 'agent:start' | 'agent:end' | 'merge' | 'done'
  agent?: string
  task?: string
  result?: string
  iteration?: number
}

/**
 * Live multi-agent topology graph. Consumes `TopologyLogEvent`s from
 * supervisor / swarm / hierarchical / blackboard runs and builds a
 * directed graph of agents and the messages flowing between them, so
 * debugging multi-agent runs stops being a tail of stringly-typed
 * logs.
 *
 * Renders to:
 *   - JSON     — for the React devtools panel
 *   - Mermaid  — for static docs / CI artefacts
 *   - ASCII    — for the Ink CLI
 *
 * Closes issue #785.
 */

/** Agent node and activity counters in a topology graph. */
export interface TopologyNode {
  id: string
  /** Display label. Defaults to the agent id. */
  label: string
  /** `'supervisor' | 'swarm' | 'hierarchical' | 'blackboard'`. */
  topology: string
  /** Activity counters useful for sizing/colouring nodes in a viz. */
  startCount: number
  endCount: number
  errorCount: number
  /** Last activity timestamp (ms since epoch). */
  lastActiveAt: number
}

/** Directed communication edge between agents in a topology graph. */
export interface TopologyEdge {
  /** `from→to` (stable id). */
  id: string
  from: string
  to: string
  /** Number of times this edge fired. */
  count: number
  /** Most recent task/result snippet (trimmed) — useful for tooltips. */
  lastTask?: string
  lastResult?: string
}

/** Mutable topology graph with serializers and change subscriptions. */
export interface TopologyGraph {
  nodes: Map<string, TopologyNode>
  edges: Map<string, TopologyEdge>
  /**
   * Send a TopologyLogEvent into the graph. Mutates state. Calls every
   * subscriber after each event.
   */
  ingest: (event: TopologyLogEvent) => void
  /** Snapshot in a JSON-serialisable form for the devtools wire. */
  toJSON: () => TopologyGraphSnapshot
  /** Mermaid graph LR diagram. */
  toMermaid: () => string
  /** ASCII renderer (Ink-friendly). */
  toAscii: () => string
  /** Subscribe to graph changes. Returns an unsubscribe handle. */
  subscribe: (handler: (snapshot: TopologyGraphSnapshot) => void) => () => void
  /** Reset to empty (e.g. when a new run starts). */
  reset: () => void
}

/** JSON-serializable node and edge snapshot with update time. */
export interface TopologyGraphSnapshot {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  /** ISO timestamp of the latest event. */
  updatedAt: string
}

/** Snippet length and clock overrides for topology graph creation. */
export interface TopologyGraphOptions {
  /** Truncation length for task/result tooltips. Default 80. */
  snippetLength?: number
  /** Wall clock — overridable for tests. */
  now?: () => number
}

function trim(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

const ROOT = '__root__'

/**
 * Create an in-memory graph for topology dispatch and agent activity events.
 * @param options Optional snippet length and clock override.
 * @returns A mutable graph with JSON, Mermaid, ASCII, and subscription APIs.
 * @example
 * ```ts
 * const graph = createTopologyGraph()
 * graph.ingest({ topology: 'swarm', phase: 'agent:start', agent: 'writer' })
 * ```
 */
export function createTopologyGraph(options: TopologyGraphOptions = {}): TopologyGraph {
  const snippet = options.snippetLength ?? 80
  const now = options.now ?? (() => Date.now())

  const nodes = new Map<string, TopologyNode>()
  const edges = new Map<string, TopologyEdge>()
  const subscribers = new Set<(s: TopologyGraphSnapshot) => void>()

  function ensureNode(id: string, topology: string): TopologyNode {
    let node = nodes.get(id)
    if (!node) {
      node = {
        id,
        label: id,
        topology,
        startCount: 0,
        endCount: 0,
        errorCount: 0,
        lastActiveAt: now(),
      }
      nodes.set(id, node)
    }
    return node
  }

  function bumpEdge(from: string, to: string, task?: string, result?: string): void {
    const id = `${from}→${to}`
    const edge = edges.get(id) ?? { id, from, to, count: 0 }
    edge.count += 1
    edge.lastTask = trim(task, snippet) ?? edge.lastTask
    edge.lastResult = trim(result, snippet) ?? edge.lastResult
    edges.set(id, edge)
  }

  function snapshot(): TopologyGraphSnapshot {
    return {
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      updatedAt: new Date(now()).toISOString(),
    }
  }

  function emit(): void {
    if (subscribers.size === 0) return
    const snap = snapshot()
    for (const fn of subscribers) fn(snap)
  }

  return {
    nodes,
    edges,

    ingest(event) {
      const root = ensureNode(ROOT, event.topology)
      root.label = event.topology
      switch (event.phase) {
        case 'dispatch':
          if (event.agent) {
            ensureNode(event.agent, event.topology)
            bumpEdge(ROOT, event.agent, event.task)
          }
          break
        case 'agent:start':
          if (event.agent) {
            const n = ensureNode(event.agent, event.topology)
            n.startCount += 1
            n.lastActiveAt = now()
          }
          break
        case 'agent:end':
          if (event.agent) {
            const n = ensureNode(event.agent, event.topology)
            n.endCount += 1
            n.lastActiveAt = now()
            bumpEdge(event.agent, ROOT, undefined, event.result)
          }
          break
        case 'merge':
          // No agent in payload by design — the supervisor merges.
          root.endCount += 1
          break
        case 'done':
          root.lastActiveAt = now()
          break
      }
      emit()
    },

    toJSON: snapshot,

    toMermaid: () => {
      const lines = ['graph LR']
      for (const node of nodes.values()) {
        const safeId = node.id.replace(/[^A-Za-z0-9_]/g, '_')
        const label = node.id === ROOT ? `[(${node.topology})]` : `[${node.label}]`
        lines.push(`  ${safeId}${label}`)
      }
      for (const edge of edges.values()) {
        const fromId = edge.from.replace(/[^A-Za-z0-9_]/g, '_')
        const toId = edge.to.replace(/[^A-Za-z0-9_]/g, '_')
        const label = edge.count > 1 ? `|${edge.count}|` : ''
        lines.push(`  ${fromId} -->${label} ${toId}`)
      }
      return lines.join('\n')
    },

    toAscii: () => {
      const lines: string[] = []
      const root = nodes.get(ROOT)
      lines.push(`(${root?.topology ?? 'topology'})`)
      const childEdges = [...edges.values()].filter(e => e.from === ROOT)
      for (const edge of childEdges) {
        const child = nodes.get(edge.to)
        if (!child) continue
        let tag: string
        if (child.errorCount > 0) tag = '✗'
        else if (child.endCount > 0) tag = '✓'
        else tag = '…'
        lines.push(`  ├─ ${tag} ${child.label} (${child.startCount} starts, ${child.endCount} done)`)
      }
      return lines.join('\n')
    },

    subscribe(handler) {
      subscribers.add(handler)
      return () => subscribers.delete(handler)
    },

    reset() {
      nodes.clear()
      edges.clear()
      emit()
    },
  }
}
