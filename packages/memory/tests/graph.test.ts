import { describe, expect, it } from 'vitest'
import { createInMemoryGraph } from '../src/graph'

describe('createInMemoryGraph', () => {
  it('upserts and reads nodes', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'u1', kind: 'user', properties: { name: 'Alice' } })
    const node = await g.getNode('u1')
    expect(node?.properties).toEqual({ name: 'Alice' })
    expect(node?.createdAt).toBeDefined()
    expect(node?.updatedAt).toBeDefined()
  })

  it('upserts merge existing nodes and bump updatedAt', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'u1', kind: 'user', properties: { name: 'A' } })
    const before = (await g.getNode('u1'))!.updatedAt
    await new Promise(r => setTimeout(r, 2))
    await g.upsertNode({ id: 'u1', kind: 'user', properties: { name: 'B' } })
    const after = await g.getNode('u1')
    expect(after?.properties).toEqual({ name: 'B' })
    expect(after?.updatedAt).not.toBe(before)
  })

  it('finds nodes by kind', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'a', kind: 'user' })
    await g.upsertNode({ id: 'b', kind: 'company' })
    const users = await g.findNodes({ kind: 'user' })
    expect(users.map(n => n.id)).toEqual(['a'])
  })

  it('finds edges by label/from/to', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'a', kind: 'user' })
    await g.upsertNode({ id: 'b', kind: 'user' })
    await g.upsertEdge({ id: 'e1', label: 'knows', from: 'a', to: 'b' })
    await g.upsertEdge({ id: 'e2', label: 'works-at', from: 'a', to: 'c' })
    expect((await g.findEdges({ label: 'knows' })).map(e => e.id)).toEqual(['e1'])
    expect((await g.findEdges({ from: 'a' })).length).toBe(2)
  })

  it('neighbors explores at the requested depth', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'a', kind: 'n' })
    await g.upsertNode({ id: 'b', kind: 'n' })
    await g.upsertNode({ id: 'c', kind: 'n' })
    await g.upsertNode({ id: 'd', kind: 'n' })
    await g.upsertEdge({ id: 'e1', label: 'r', from: 'a', to: 'b' })
    await g.upsertEdge({ id: 'e2', label: 'r', from: 'b', to: 'c' })
    await g.upsertEdge({ id: 'e3', label: 'r', from: 'c', to: 'd' })
    expect((await g.neighbors('a', { depth: 1 })).map(n => n.id).sort()).toEqual(['b'])
    expect((await g.neighbors('a', { depth: 2 })).map(n => n.id).sort()).toEqual(['b', 'c'])
  })

  it('neighbors filters by label', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'a', kind: 'n' })
    await g.upsertNode({ id: 'b', kind: 'n' })
    await g.upsertNode({ id: 'c', kind: 'n' })
    await g.upsertEdge({ id: 'e1', label: 'knows', from: 'a', to: 'b' })
    await g.upsertEdge({ id: 'e2', label: 'ignores', from: 'a', to: 'c' })
    const hits = await g.neighbors('a', { label: 'knows' })
    expect(hits.map(n => n.id)).toEqual(['b'])
  })

  it('deleteNode cascades edges', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'a', kind: 'n' })
    await g.upsertNode({ id: 'b', kind: 'n' })
    await g.upsertEdge({ id: 'e1', label: 'r', from: 'a', to: 'b' })
    await g.deleteNode('a')
    expect(await g.findEdges({ label: 'r' })).toHaveLength(0)
  })

  it('clear empties the graph', async () => {
    const g = createInMemoryGraph()
    await g.upsertNode({ id: 'a', kind: 'n' })
    await g.clear?.()
    expect(await g.findNodes()).toHaveLength(0)
  })
})
