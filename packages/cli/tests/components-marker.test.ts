import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { IntegrityError } from '../src/components/install'
import type { FileToWrite } from '../src/components/install'
import {
  appendAudit,
  buildInstalledComponent,
  canonicalJson,
  findInstalled,
  parseAuditLog,
  removeInstalled,
  serializeAuditLog,
  upsertInstalled,
  verifyAuditChain,
} from '../src/components/marker'
import type { AuditEntry, ComponentsConfig, FrameworkTarget, InstalledComponent } from '../src/components/types'

const FW: FrameworkTarget = { uiBinding: 'react', metaFramework: 'next-app' }

function sha(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

function baseConfig(installed?: InstalledComponent[]): ComponentsConfig {
  return {
    $schema: 'https://example/schema.json',
    schemaVersion: 1,
    uiBinding: 'react',
    metaFramework: 'next-app',
    typescript: true,
    styling: { mode: 'data-attrs-only', css: 'app/globals.css', tailwindConfig: null },
    aliases: { components: '@/components', lib: '@/lib', server: 'app/api' },
    paths: { root: '.', components: 'components', lib: 'lib', server: 'app/api' },
    registries: { default: 'https://registry.agentskit.io' },
    ...(installed ? { installed } : {}),
  }
}

function marker(id: string, installPath: string): InstalledComponent {
  return {
    id,
    kind: 'component',
    framework: FW,
    installPath,
    ref: 'main',
    version: '1.0.0',
    files: { 'widget.tsx': { sha: sha('x'), installedAt: '2026-01-01T00:00:00Z' } },
  }
}

function auditBase(id: string): Omit<AuditEntry, 'prevEntryHash'> {
  return {
    schemaVersion: 1,
    eventType: 'install',
    id,
    version: '1.0.0',
    ref: 'main',
    files: [{ path: 'widget.tsx', sha256: sha('x') }],
    manifestSigRef: 'sig-1',
    timestamp: '2026-01-01T00:00:00Z',
  }
}

describe('install marker — upsert / find / remove (D15)', () => {
  it('upsert adds a new entry', () => {
    const cfg = upsertInstalled(baseConfig(), marker('ask', 'apps/web/components/ask'))
    expect(cfg.installed).toHaveLength(1)
    expect(cfg.installed?.[0].id).toBe('ask')
  })

  it('upsert replaces an entry with the same id + installPath', () => {
    const first = marker('ask', 'apps/web/components/ask')
    const cfg1 = upsertInstalled(baseConfig(), first)
    const updated: InstalledComponent = { ...first, version: '2.0.0' }
    const cfg2 = upsertInstalled(cfg1, updated)
    expect(cfg2.installed).toHaveLength(1)
    expect(cfg2.installed?.[0].version).toBe('2.0.0')
  })

  it('upsert keeps separate entries for the same id at different installPaths (monorepo-safe)', () => {
    const cfg1 = upsertInstalled(baseConfig(), marker('ask', 'apps/web/components/ask'))
    const cfg2 = upsertInstalled(cfg1, marker('ask', 'apps/admin/components/ask'))
    expect(cfg2.installed).toHaveLength(2)
    expect(cfg2.installed?.map((e) => e.installPath)).toEqual([
      'apps/web/components/ask',
      'apps/admin/components/ask',
    ])
  })

  it('upsert does not mutate the input config', () => {
    const cfg = baseConfig()
    const next = upsertInstalled(cfg, marker('ask', 'apps/web/components/ask'))
    expect(cfg.installed).toBeUndefined()
    expect(next).not.toBe(cfg)
  })

  it('findInstalled returns the entry when present and undefined otherwise', () => {
    const cfg = upsertInstalled(baseConfig(), marker('ask', 'apps/web/components/ask'))
    expect(findInstalled(cfg, 'ask', 'apps/web/components/ask')?.id).toBe('ask')
    expect(findInstalled(cfg, 'ask', 'apps/admin/components/ask')).toBeUndefined()
    expect(findInstalled(cfg, 'missing', 'apps/web/components/ask')).toBeUndefined()
  })

  it('removeInstalled drops the matching entry only', () => {
    let cfg = upsertInstalled(baseConfig(), marker('ask', 'apps/web/components/ask'))
    cfg = upsertInstalled(cfg, marker('ask', 'apps/admin/components/ask'))
    const after = removeInstalled(cfg, 'ask', 'apps/web/components/ask')
    expect(after.installed).toHaveLength(1)
    expect(after.installed?.[0].installPath).toBe('apps/admin/components/ask')
  })
})

describe('buildInstalledComponent (D15)', () => {
  it('records the sha256 hex of each file content with the injected timestamp', () => {
    const files: FileToWrite[] = [
      { path: 'widget.tsx', content: 'export const Widget = () => null' },
      { path: 'lib/guard.ts', content: 'export const guard = true' },
    ]
    const now = '2026-06-18T12:00:00Z'
    const entry = buildInstalledComponent({
      id: 'ask',
      framework: FW,
      installPath: 'apps/web/components/ask',
      ref: 'v1',
      version: '1.2.3',
      files,
      now,
    })
    expect(entry.id).toBe('ask')
    expect(entry.kind).toBe('component')
    expect(entry.files['widget.tsx'].sha).toBe(sha('export const Widget = () => null'))
    expect(entry.files['lib/guard.ts'].sha).toBe(sha('export const guard = true'))
    expect(entry.files['widget.tsx'].installedAt).toBe(now)
  })

  it('rejects duplicate file paths via IntegrityError', () => {
    const files: FileToWrite[] = [
      { path: 'widget.tsx', content: 'a' },
      { path: 'widget.tsx', content: 'b' },
    ]
    expect(() =>
      buildInstalledComponent({
        id: 'ask',
        framework: FW,
        installPath: 'p',
        ref: 'v1',
        version: '1.0.0',
        files,
        now: 'now',
      }),
    ).toThrow(IntegrityError)
  })
})

describe('audit chain — append + verify (D9)', () => {
  it('the first entry has prevEntryHash === ""', () => {
    const e0 = appendAudit([], auditBase('a'))
    expect(e0.prevEntryHash).toBe('')
  })

  it('the second entry links to the canonical hash of the first', () => {
    const e0 = appendAudit([], auditBase('a'))
    const e1 = appendAudit([e0], auditBase('b'))
    expect(e1.prevEntryHash).toBe(sha(canonicalJson(e0)))
  })

  it('verifyAuditChain returns ok:true, brokenAt:null for a valid chain', () => {
    const e0 = appendAudit([], auditBase('a'))
    const e1 = appendAudit([e0], auditBase('b'))
    const e2 = appendAudit([e0, e1], auditBase('c'))
    expect(verifyAuditChain([e0, e1, e2])).toEqual({ ok: true, brokenAt: null })
  })

  it('detects a tampered entry at its index', () => {
    const e0 = appendAudit([], auditBase('a'))
    const e1 = appendAudit([e0], auditBase('b'))
    const e2 = appendAudit([e0, e1], auditBase('c'))
    // mutate the payload of e1 — the link from e2 no longer matches.
    const tampered: AuditEntry = { ...e1, version: '9.9.9' }
    const res = verifyAuditChain([e0, tampered, e2])
    expect(res.ok).toBe(false)
    expect(res.brokenAt).toBe(2)
  })

  it('detects reordered entries', () => {
    const e0 = appendAudit([], auditBase('a'))
    const e1 = appendAudit([e0], auditBase('b'))
    const e2 = appendAudit([e0, e1], auditBase('c'))
    // swap e1 and e2 — e2's prevEntryHash no longer matches the (now) prior entry,
    // and the first-position entry no longer carries ''.
    const res = verifyAuditChain([e0, e2, e1])
    expect(res.ok).toBe(false)
    expect(res.brokenAt).toBe(1)
  })

  it('detects a deleted entry', () => {
    const e0 = appendAudit([], auditBase('a'))
    const e1 = appendAudit([e0], auditBase('b'))
    const e2 = appendAudit([e0, e1], auditBase('c'))
    // drop e1 — e2 now links to e0 but its prevEntryHash points at e1.
    const res = verifyAuditChain([e0, e2])
    expect(res.ok).toBe(false)
    expect(res.brokenAt).toBe(1)
  })
})

describe('audit log serialization (NDJSON)', () => {
  it('serializeAuditLog ↔ parseAuditLog round-trips', () => {
    const e0 = appendAudit([], auditBase('a'))
    const e1 = appendAudit([e0], auditBase('b'))
    const raw = serializeAuditLog([e0, e1])
    expect(raw.split('\n').filter((l) => l !== '')).toHaveLength(2)
    expect(parseAuditLog(raw)).toEqual([e0, e1])
  })

  it('parseAuditLog skips blank and malformed lines', () => {
    const e0 = appendAudit([], auditBase('a'))
    const raw = `${JSON.stringify(e0)}\n\nnot json\n[1,2,3]\n`
    expect(parseAuditLog(raw)).toEqual([e0])
  })

  it('serializeAuditLog returns an empty string for no entries', () => {
    expect(serializeAuditLog([])).toBe('')
  })
})
