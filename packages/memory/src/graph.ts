/**
 * Non-linear memory: a typed knowledge graph. Use for facts the
 * agent should remember beyond a single conversation — entities,
 * relationships, derived beliefs. Designed to be backed by anything
 * from an in-memory Map (tests, demos) to Neo4j / Memgraph / Neptune.
 */

export interface GraphNode<TProps = Record<string, unknown>> {
  id: string
  /** Type / label — 'person', 'company', 'topic'. */
  kind: string
  properties?: TProps
  /** ISO timestamp when the node was first inserted. */
  createdAt?: string
  /** ISO timestamp of the latest update. */
  updatedAt?: string
}

export interface GraphEdge<TProps = Record<string, unknown>> {
  id: string
  /** Verb / relation type — 'knows', 'works-at', 'cites'. */
  label: string
  from: string
  to: string
  /** Optional weight — confidence, recency, or frequency. */
  weight?: number
  properties?: TProps
}

export interface GraphQuery {
  kind?: string
  label?: string
  from?: string
  to?: string
}

export interface GraphMemory {
  upsertNode: <T>(node: GraphNode<T>) => Promise<GraphNode<T>>
  upsertEdge: <T>(edge: GraphEdge<T>) => Promise<GraphEdge<T>>
  getNode: <T>(id: string) => Promise<GraphNode<T> | null>
  findNodes: <T>(query?: GraphQuery) => Promise<GraphNode<T>[]>
  findEdges: <T>(query?: GraphQuery) => Promise<GraphEdge<T>[]>
  /** Breadth-first neighbors of `id` up to `depth`. Default 1. */
  neighbors: <T>(id: string, options?: { depth?: number; label?: string }) => Promise<GraphNode<T>[]>
  deleteNode: (id: string) => Promise<void>
  deleteEdge: (id: string) => Promise<void>
  clear?: () => Promise<void>
}

/**
 * In-memory graph — fine for tests, single-process demos, and as
 * reference for what a backing store needs to implement.
 */
export function createInMemoryGraph(): GraphMemory {
  const nodes = new Map<string, GraphNode<unknown>>()
  const edges = new Map<string, GraphEdge<unknown>>()

  const matchesNode = (node: GraphNode<unknown>, query?: GraphQuery): boolean => {
    if (!query) return true
    if (query.kind && node.kind !== query.kind) return false
    return true
  }
  const matchesEdge = (edge: GraphEdge<unknown>, query?: GraphQuery): boolean => {
    if (!query) return true
    if (query.label && edge.label !== query.label) return false
    if (query.from && edge.from !== query.from) return false
    if (query.to && edge.to !== query.to) return false
    return true
  }

  return {
    async upsertNode<T>(node: GraphNode<T>) {
      const now = new Date().toISOString()
      const existing = nodes.get(node.id)
      const merged = {
        ...(existing ?? {}),
        ...node,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      nodes.set(node.id, merged as GraphNode<unknown>)
      return merged as GraphNode<T>
    },
    async upsertEdge(edge) {
      edges.set(edge.id, edge as GraphEdge<unknown>)
      return edge
    },
    async getNode<T>(id: string) {
      const hit = nodes.get(id)
      return hit ? ({ ...hit } as GraphNode<T>) : null
    },
    async findNodes<T>(query?: GraphQuery) {
      return Array.from(nodes.values())
        .filter(n => matchesNode(n, query))
        .map(n => ({ ...n }) as GraphNode<T>)
    },
    async findEdges<T>(query?: GraphQuery) {
      return Array.from(edges.values())
        .filter(e => matchesEdge(e, query))
        .map(e => ({ ...e }) as GraphEdge<T>)
    },
    async neighbors<T>(id: string, options: { depth?: number; label?: string } = {}) {
      const depth = Math.max(1, options.depth ?? 1)
      const visited = new Set<string>([id])
      let frontier = new Set<string>([id])
      for (let i = 0; i < depth; i++) {
        const next = new Set<string>()
        for (const edge of edges.values()) {
          if (options.label && edge.label !== options.label) continue
          if (frontier.has(edge.from) && !visited.has(edge.to)) next.add(edge.to)
          if (frontier.has(edge.to) && !visited.has(edge.from)) next.add(edge.from)
        }
        for (const n of next) visited.add(n)
        frontier = next
        if (next.size === 0) break
      }
      visited.delete(id)
      return Array.from(visited, nid => nodes.get(nid)).filter((n): n is GraphNode<unknown> => Boolean(n)).map(n => ({ ...n }) as GraphNode<T>)
    },
    async deleteNode(id) {
      nodes.delete(id)
      for (const [eid, edge] of edges) {
        if (edge.from === id || edge.to === id) edges.delete(eid)
      }
    },
    async deleteEdge(id) {
      edges.delete(id)
    },
    async clear() {
      nodes.clear()
      edges.clear()
    },
  }
}
