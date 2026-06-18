import { describe, expect, it } from 'vitest'
import {
  fetchManifest,
  fetchPortFiles,
  resolveAuthHeader,
  resolveIdentifier,
  sha256Hex,
  verifyChecksums,
  type FetchLike,
} from '../src/components/fetch'
import { IntegrityError } from '../src/components/install'
import type { ComponentPort, RegistryComponent } from '../src/components/types'

const registries = { default: 'https://registry.agentskit.io', acme: 'https://acme.internal/ak' }

/** Fake FetchLike from a url → body map (missing url → 404). */
function fakeFetch(map: Record<string, string>): FetchLike {
  return async (url) => {
    const body = map[url]
    if (body == null) return { ok: false, status: 404, text: async () => 'not found' }
    return { ok: true, status: 200, text: async () => body }
  }
}

function makePort(files: ComponentPort['files']): ComponentPort {
  return {
    uiBinding: 'react',
    language: 'ts',
    stylingMode: 'data-attrs-only',
    streamingProtocol: 'ndjson',
    files,
    defaultTarget: 'components/ask',
  }
}

function manifest(over: Partial<RegistryComponent> = {}): RegistryComponent {
  return {
    $schema: 'x',
    schemaVersion: 1,
    kind: 'component',
    id: 'docs-chat',
    version: '1.0.0',
    title: 'Ask the docs',
    description: '',
    category: 'chat',
    frameworks: [{ uiBinding: 'react', metaFramework: 'next-app' }],
    ports: { react: makePort([]) },
    packages: [],
    ...over,
  }
}

describe('resolveIdentifier', () => {
  it('resolves bare / namespaced / URL identifiers', () => {
    expect(resolveIdentifier('docs-chat', { registries })).toEqual({
      base: 'https://registry.agentskit.io',
      itemId: 'docs-chat',
    })
    expect(resolveIdentifier('@acme/chat', { registries })).toEqual({
      base: 'https://acme.internal/ak',
      itemId: 'chat',
    })
    expect(resolveIdentifier('https://reg.example.com/v1/r/docs-chat.json', { registries })).toEqual({
      base: 'https://reg.example.com/v1',
      itemId: 'docs-chat',
    })
    expect(resolveIdentifier('docs-chat', { registries }, { registryBase: 'https://mirror.local' })).toEqual({
      base: 'https://mirror.local',
      itemId: 'docs-chat',
    })
  })

  it('throws on an unknown namespace', () => {
    expect(() => resolveIdentifier('@nope/chat', { registries })).toThrow(IntegrityError)
  })
})

describe('resolveAuthHeader', () => {
  it('injects a bearer token from the mapped env var, else nothing', () => {
    const config = { registryAuth: { 'https://acme.internal/ak': 'ACME_TOKEN' } }
    expect(resolveAuthHeader('https://acme.internal/ak', config, { ACME_TOKEN: 'sek' })).toEqual({
      authorization: 'Bearer sek',
    })
    expect(resolveAuthHeader('https://acme.internal/ak', config, {})).toEqual({})
    expect(resolveAuthHeader('https://registry.agentskit.io', config, { ACME_TOKEN: 'sek' })).toEqual({})
  })
})

describe('checksums', () => {
  it('passes matching and aborts on mismatch', () => {
    expect(() =>
      verifyChecksums([{ path: 'a', content: 'hi', sha256: sha256Hex('hi') }]),
    ).not.toThrow()
    expect(() =>
      verifyChecksums([{ path: 'a', content: 'hi', sha256: 'deadbeef' }]),
    ).toThrow(IntegrityError)
  })
})

describe('fetchManifest', () => {
  const base = 'https://registry.agentskit.io'
  const url = `${base}/r/docs-chat.json`

  it('fetches, parses, and version-gates', async () => {
    const fetchImpl = fakeFetch({ [url]: JSON.stringify(manifest()) })
    const { ref, component } = await fetchManifest('docs-chat', { fetchImpl, config: { registries } })
    expect(ref.itemId).toBe('docs-chat')
    expect(component.kind).toBe('component')
  })

  it('rejects a non-component, a too-new schema, and a 404', async () => {
    const agent = fakeFetch({ [url]: JSON.stringify({ kind: 'agent', schemaVersion: 1 }) })
    await expect(fetchManifest('docs-chat', { fetchImpl: agent, config: { registries } })).rejects.toThrow(IntegrityError)

    const future = fakeFetch({ [url]: JSON.stringify(manifest({ schemaVersion: 99 })) })
    await expect(fetchManifest('docs-chat', { fetchImpl: future, config: { registries } })).rejects.toThrow(/newer CLI/)

    await expect(fetchManifest('docs-chat', { fetchImpl: fakeFetch({}), config: { registries } })).rejects.toThrow(IntegrityError)
  })

  it('enforces the signature seam when provided', async () => {
    const fetchImpl = fakeFetch({ [url]: JSON.stringify(manifest()), [`${url}.minisig`]: 'SIG' })
    await expect(
      fetchManifest('docs-chat', { fetchImpl, config: { registries }, signatureVerifier: async () => false }),
    ).rejects.toThrow(/signature verification failed/)
    const ok = await fetchManifest('docs-chat', {
      fetchImpl,
      config: { registries },
      signatureVerifier: async (raw, sig) => raw.includes('docs-chat') && sig === 'SIG',
    })
    expect(ok.component.id).toBe('docs-chat')
  })
})

describe('fetchPortFiles', () => {
  const ref = { base: 'https://registry.agentskit.io', itemId: 'docs-chat' }

  it('uses inline content, fetches the rest, and verifies every checksum', async () => {
    const fetchImpl = fakeFetch({ [`${ref.base}/r/docs-chat/widget.tsx`]: 'WIDGET' })
    const port = makePort([
      { path: 'lib.ts', type: 'registry:lib', sha256: sha256Hex('INLINE'), content: 'INLINE' },
      { path: 'widget.tsx', type: 'registry:component', sha256: sha256Hex('WIDGET') },
    ])
    const files = await fetchPortFiles(ref, port, { fetchImpl })
    expect(files).toEqual([
      { path: 'lib.ts', content: 'INLINE' },
      { path: 'widget.tsx', content: 'WIDGET' },
    ])
  })

  it('aborts the whole set on a tampered file', async () => {
    const fetchImpl = fakeFetch({ [`${ref.base}/r/docs-chat/widget.tsx`]: 'TAMPERED' })
    const port = makePort([{ path: 'widget.tsx', type: 'registry:component', sha256: sha256Hex('ORIGINAL') }])
    await expect(fetchPortFiles(ref, port, { fetchImpl })).rejects.toThrow(IntegrityError)
  })
})
