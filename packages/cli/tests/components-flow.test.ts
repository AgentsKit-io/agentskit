import { describe, expect, it } from 'vitest'
import { AUDIT_PATH, addComponent, type AddDeps } from '../src/components/flow'
import { CONFIG_PATH } from '../src/components/config'
import { sha256Hex, type FetchLike } from '../src/components/fetch'
import { parseAuditLog, verifyAuditChain } from '../src/components/marker'
import { IntegrityError, type WriteFs } from '../src/components/install'
import { type ScanFs } from '../src/components/scan'
import type { RegistryComponent } from '../src/components/types'

const NOW = '2026-06-18T00:00:00.000Z'
const BASE = 'https://registry.agentskit.io'
const WIDGET = 'export const Widget = () => null'
const GUARD = 'export const guard = true'

function scanFs(pkg: Record<string, unknown>, dirs: string[] = ['app']): ScanFs {
  const files: Record<string, string> = {
    'package.json': JSON.stringify(pkg),
    'tsconfig.json': '{}',
  }
  const dirSet = new Set(dirs)
  return {
    readFile: (p) => files[p] ?? null,
    exists: (p) => p in files || dirSet.has(p),
  }
}

/** ConfigIo + WriteFs backed by Maps, exposed for assertions. */
function fakeIo() {
  const files = new Map<string, string>()
  const io = { files, read: (p: string) => files.get(p) ?? null, write: (p: string, c: string) => void files.set(p, c) }
  return io
}
function fakeWriteFs() {
  const files = new Map<string, string>()
  const fs: WriteFs & { files: Map<string, string> } = {
    files,
    exists: (p) => files.has(p),
    write: (p, c) => void files.set(p, c),
    remove: (p) => void files.delete(p),
  }
  return fs
}

function fakeFetch(extra: Record<string, string> = {}): FetchLike {
  const map: Record<string, string> = { [`${BASE}/r/docs-chat/widget.tsx`]: WIDGET, ...extra }
  return async (url) => {
    const body = map[url]
    if (body == null) return { ok: false, status: 404, text: async () => 'nope' }
    return { ok: true, status: 200, text: async () => body }
  }
}

function manifest(over: Partial<RegistryComponent> = {}): string {
  const m: RegistryComponent = {
    $schema: 'x',
    schemaVersion: 1,
    kind: 'component',
    id: 'docs-chat',
    version: '1.2.0',
    title: 'Ask the docs',
    description: '',
    category: 'chat',
    frameworks: [{ uiBinding: 'react', metaFramework: 'next-app' }],
    ports: {
      react: {
        uiBinding: 'react',
        language: 'ts',
        stylingMode: 'data-attrs-only',
        streamingProtocol: 'ndjson',
        defaultTarget: 'components/ask',
        files: [
          { path: 'widget.tsx', type: 'registry:component', sha256: sha256Hex(WIDGET) },
          { path: 'lib/guard.ts', type: 'registry:lib', sha256: sha256Hex(GUARD), content: GUARD },
        ],
        server: {
          delivery: 'bundled',
          runtimeRequirement: 'nodejs',
          embeddingBackend: 'onnx-node',
          rateLimitBackend: 'memory',
        },
      },
    },
    packages: ['@agentskit/rag', '@agentskit/adapters'],
    env: [{ name: 'OPENROUTER_API_KEY', description: 'key', required: true, scope: 'server' }],
    ...over,
  }
  return JSON.stringify(m)
}

function deps(over: Partial<AddDeps> = {}): AddDeps {
  return {
    scanFs: scanFs({ dependencies: { next: '15.0.0', react: '19.0.0' }, devDependencies: { typescript: '5.0.0' } }),
    io: fakeIo(),
    writeFs: fakeWriteFs(),
    fetchImpl: fakeFetch({ [`${BASE}/r/docs-chat.json`]: manifest() }),
    now: () => NOW,
    ...over,
  }
}

describe('addComponent (end-to-end)', () => {
  it('installs: commits files, writes the marker, appends the audit chain', async () => {
    const d = deps()
    const res = await addComponent({ identifier: 'docs-chat' }, d)

    expect(res.id).toBe('docs-chat')
    expect(res.version).toBe('1.2.0')
    expect(res.installPath).toBe('components/ask')
    expect(res.framework).toEqual({ uiBinding: 'react', metaFramework: 'next-app' })
    expect(res.written).toHaveLength(2)
    expect(res.packages).toEqual(['@agentskit/rag', '@agentskit/adapters'])
    expect(res.env[0]?.name).toBe('OPENROUTER_API_KEY')
    // serverless + memory limiter → a non-blocking warning surfaced.
    expect(res.warnings.map((w) => w.code)).toContain('ratelimit-memory')
    expect(res.configFromDisk).toBe(false)

    // files actually written (content-verified by the flow).
    const io = d.io as ReturnType<typeof fakeIo>
    const wfs = d.writeFs as ReturnType<typeof fakeWriteFs>
    expect([...wfs.files.values()]).toContain(WIDGET)
    expect([...wfs.files.values()]).toContain(GUARD)

    // marker recorded on components.json.
    const config = JSON.parse(io.files.get(CONFIG_PATH)!)
    expect(config.installed).toHaveLength(1)
    expect(config.installed[0]).toMatchObject({ id: 'docs-chat', installPath: 'components/ask', version: '1.2.0' })
    expect(config.installed[0].files['widget.tsx'].sha).toBe(sha256Hex(WIDGET))

    // audit chain: one valid entry.
    const log = parseAuditLog(io.files.get(AUDIT_PATH)!)
    expect(log).toHaveLength(1)
    expect(log[0]!.eventType).toBe('install')
    expect(log[0]!.prevEntryHash).toBe('')
    expect(verifyAuditChain(log).ok).toBe(true)
  })

  it('links a second install into the audit chain', async () => {
    const io = fakeIo()
    const d = deps({ io, writeFs: fakeWriteFs() })
    await addComponent({ identifier: 'docs-chat' }, d)
    // second install elsewhere via --out (avoids a file conflict).
    await addComponent({ identifier: 'docs-chat', outDir: 'components/ask2' }, deps({ io, writeFs: fakeWriteFs() }))

    const log = parseAuditLog(io.files.get(AUDIT_PATH)!)
    expect(log).toHaveLength(2)
    expect(log[1]!.prevEntryHash).not.toBe('')
    expect(verifyAuditChain(log).ok).toBe(true)
  })

  it('aborts (nothing written) when validation fails — TS-only port into a JS project', async () => {
    const d = deps({
      scanFs: scanFs({ dependencies: { next: '15.0.0', react: '19.0.0' } }), // no typescript dep, no tsconfig handled below
    })
    // force JS: a scanFs without tsconfig.json.
    const jsScan: ScanFs = {
      readFile: (p) => (p === 'package.json' ? JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }) : null),
      exists: (p) => p === 'app',
    }
    await expect(addComponent({ identifier: 'docs-chat' }, deps({ scanFs: jsScan }))).rejects.toThrow(IntegrityError)
    const wfs = d.writeFs as ReturnType<typeof fakeWriteFs>
    expect(wfs.files.size).toBe(0)
  })

  it('aborts on a tampered file (checksum mismatch)', async () => {
    const tampered = fakeFetch({ [`${BASE}/r/docs-chat.json`]: manifest(), [`${BASE}/r/docs-chat/widget.tsx`]: 'HACKED' })
    await expect(addComponent({ identifier: 'docs-chat' }, deps({ fetchImpl: tampered }))).rejects.toThrow(IntegrityError)
  })
})
