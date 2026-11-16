import { describe, expect, it } from 'vitest'
import {
  agentskitDependencies,
  buildRows,
  hasRecentBreakingChange,
  renderMatrix,
  renderReadmeBlock,
  syncKeyword,
  updateReadme,
} from './gen-support-matrix.mjs'

const pkg = (name, extra = {}) => ({ name, version: '0.5.0', breaking: false, docs: true, ...extra })

describe('support matrix', () => {
  it('collects @agentskit dependencies from every dependency field', () => {
    expect(
      agentskitDependencies({ dependencies: { '@agentskit/core': '1', react: '1' }, peerDependencies: { '@agentskit/rag': '1' } }),
    ).toEqual(['@agentskit/core', '@agentskit/rag'])
  })

  it('detects breaking changes only in the last four versions', () => {
    const log = ['# Changelog', '## 5.0.0', '- ok', '## 4.0.0', '## 3.0.0', '## 2.0.0', '## 1.0.0', '- BREAKING: x'].join('\n')
    expect(hasRecentBreakingChange(log)).toBe(false)
    expect(hasRecentBreakingChange(log.replace('- ok', '- feat!: drop x'))).toBe(true)
  })

  it('marks consumerless packages experimental and checks 1.0 criteria for the rest', () => {
    const rows = buildRows({
      packages: [pkg('@agentskit/a'), pkg('@agentskit/b'), pkg('@agentskit/c'), pkg('@agentskit/d', { version: '1.2.0' })],
      consumers: [
        { repo: 'AgentsKit-io/x', environment: 'production', dependencies: ['@agentskit/a', '@agentskit/d'] },
        { repo: 'NoxCodeSolutions/y', environment: 'development', dependencies: ['@agentskit/b'] },
      ],
      ci: 'green',
    })
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]))
    expect(byName['@agentskit/a']).toMatchObject({ supported: true, eligible: true })
    expect(byName['@agentskit/b']).toMatchObject({ supported: true, eligible: false })
    expect(byName['@agentskit/c']).toMatchObject({ supported: false, eligible: false })
    expect(byName['@agentskit/d']).toMatchObject({ supported: true, eligible: false, stable: true })
    expect(renderMatrix(rows, 'green')).toContain('| `@agentskit/c` | 0.5.0 | experimental | — |')
  })

  it('does not make packages eligible while CI is not green', () => {
    const [row] = buildRows({
      packages: [pkg('@agentskit/a')],
      consumers: [{ repo: 'r', environment: 'homolog', dependencies: ['@agentskit/a'] }],
      ci: 'unknown',
    })
    expect(row.eligible).toBe(false)
  })

  it('syncs the experimental keyword idempotently', () => {
    expect(syncKeyword(['ai'], true)).toEqual(['ai', 'experimental'])
    expect(syncKeyword(['ai', 'experimental'], true)).toEqual(['ai', 'experimental'])
    expect(syncKeyword(['ai', 'experimental'], false)).toEqual(['ai'])
  })

  it('inserts then replaces the README block', () => {
    const rows = buildRows({ packages: [pkg('@agentskit/c')], consumers: [], ci: 'green' })
    const once = updateReadme('intro\n## Verified proof\nx', renderReadmeBlock(rows))
    expect(once).toContain('- `@agentskit/c`')
    expect(updateReadme(once, renderReadmeBlock(rows))).toBe(once)
  })
})
