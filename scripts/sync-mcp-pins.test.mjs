import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { MCP_PIN_FILES, runSyncMcpPins, syncMcpPins } from './sync-mcp-pins.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('sync-mcp-pins', () => {
  it('rewrites package pins and matching YAML version lines only', () => {
    const source = [
      'npx -y @agentskit/mcp@0.4.3 --tools fetch,search',
      '"args": ["-y", "@agentskit/mcp@0.4.3"]',
      'version: 0.4.3',
      'version: 1.2.3', // unrelated YAML version stays
      'npm install @agentskit/core@1.12.9', // other packages stay
    ].join('\n')
    const { output, pins } = syncMcpPins(source, '0.4.4')
    expect(pins).toEqual(['0.4.3'])
    expect(output).toBe([
      'npx -y @agentskit/mcp@0.4.4 --tools fetch,search',
      '"args": ["-y", "@agentskit/mcp@0.4.4"]',
      'version: 0.4.4',
      'version: 1.2.3',
      'npm install @agentskit/core@1.12.9',
    ].join('\n'))
    expect(syncMcpPins('no pins here\nversion: 0.4.3', '0.4.4')).toEqual({ output: 'no pins here\nversion: 0.4.3', pins: [] })
    expect(() => syncMcpPins('', 'latest')).toThrow(/invalid/)
  })

  it('is a no-op on the repository at its current version and reports drift in --check mode', () => {
    expect(runSyncMcpPins(REPO_ROOT, { check: true })).toMatchObject({ drifted: [], missing: [] })

    const root = mkdtempSync(join(tmpdir(), 'mcp-pins-'))
    for (const relativePath of [...MCP_PIN_FILES, 'packages/mcp/package.json']) {
      const target = join(root, relativePath)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, readFileSync(join(REPO_ROOT, relativePath), 'utf8'))
    }
    const manifestPath = join(root, 'packages/mcp/package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const [major, minor, patch] = manifest.version.split('.').map(Number)
    const next = `${major}.${minor}.${patch + 1}`
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, version: next }, null, 2))

    const checked = runSyncMcpPins(root, { check: true })
    expect(checked.version).toBe(next)
    expect(checked.drifted).toEqual(MCP_PIN_FILES)
    expect(readFileSync(join(root, MCP_PIN_FILES[1]), 'utf8')).toContain(`@agentskit/mcp@${manifest.version}`)

    const lines = []
    expect(runSyncMcpPins(root, { log: (line) => lines.push(line) }).drifted).toEqual(MCP_PIN_FILES)
    expect(lines).toHaveLength(MCP_PIN_FILES.length)
    for (const relativePath of MCP_PIN_FILES) {
      const source = readFileSync(join(root, relativePath), 'utf8')
      expect(source).not.toContain(`@agentskit/mcp@${manifest.version}`)
      expect(source).toContain(`@agentskit/mcp@${next}`)
    }
    expect(readFileSync(join(root, MCP_PIN_FILES[1]), 'utf8')).toContain(`version: ${next}`)
    expect(runSyncMcpPins(root, { check: true }).drifted).toEqual([])
  })
})
