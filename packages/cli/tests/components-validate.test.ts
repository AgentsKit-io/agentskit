import { describe, expect, it } from 'vitest'
import { satisfiesRange, validateInstall } from '../src/components/validate'
import type { ComponentPort, ProjectScan, RegistryComponent } from '../src/components/types'

function makePort(over: Partial<ComponentPort> = {}): ComponentPort {
  return {
    uiBinding: 'react',
    language: 'ts',
    stylingMode: 'data-attrs-only',
    streamingProtocol: 'ndjson',
    files: [],
    defaultTarget: 'components/ask',
    server: {
      delivery: 'bundled',
      runtimeRequirement: 'nodejs',
      embeddingBackend: 'onnx-node',
      rateLimitBackend: 'external-required',
    },
    ...over,
  }
}

function makeComponent(over: Partial<RegistryComponent> = {}): RegistryComponent {
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
    ports: { react: makePort() },
    packages: [],
    env: [],
    ...over,
  }
}

function makeScan(over: Partial<ProjectScan> = {}): ProjectScan {
  return {
    uiBinding: 'react',
    metaFramework: 'next-app',
    packageManager: 'pnpm',
    typescript: true,
    srcDir: 'src',
    importAlias: '@',
    styling: { mode: 'data-attrs-only', cssEntry: null },
    monorepo: null,
    ...over,
  }
}

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code)

describe('satisfiesRange', () => {
  it('handles the subset peerRanges use', () => {
    expect(satisfiesRange('2.1.0', '>=2')).toBe(true)
    expect(satisfiesRange('1.9.0', '>=2')).toBe(false)
    expect(satisfiesRange('1.4.2', '^1.2.0')).toBe(true)
    expect(satisfiesRange('2.0.0', '^1.2.0')).toBe(false)
    expect(satisfiesRange('1.2.9', '~1.2.0')).toBe(true)
    expect(satisfiesRange('1.3.0', '~1.2.0')).toBe(false)
    expect(satisfiesRange('3.0.0', '*')).toBe(true)
    expect(satisfiesRange('1.0.0', 'workspace:*')).toBe(true)
    expect(satisfiesRange('2.0.0', '1.x || >=2')).toBe(true)
    expect(satisfiesRange('1.2.3', '1.2.3')).toBe(true)
  })
})

describe('validateInstall', () => {
  it('passes a supported react × next-app target', () => {
    const r = validateInstall({ scan: makeScan(), component: makeComponent() })
    expect(r.ok).toBe(true)
    expect(r.issues).toHaveLength(0)
    expect(r.port).toBeDefined()
  })

  it('errors on an undetected framework', () => {
    const r = validateInstall({ scan: makeScan({ uiBinding: 'unknown' }), component: makeComponent() })
    expect(r.ok).toBe(false)
    expect(codes(r)).toContain('framework-unknown')
  })

  it('errors when the binding has no port', () => {
    const r = validateInstall({ scan: makeScan({ uiBinding: 'vue', metaFramework: 'nuxt' }), component: makeComponent() })
    expect(r.ok).toBe(false)
    expect(codes(r)).toContain('binding-unsupported')
  })

  it('errors when the (binding, meta) pair is not shipped', () => {
    const r = validateInstall({ scan: makeScan({ metaFramework: 'remix' }), component: makeComponent() })
    expect(codes(r)).toContain('target-unsupported')
  })

  it('errors on a peer-range mismatch but accepts workspace + uninstalled', () => {
    const component = makeComponent({ peerRanges: { '@agentskit/react': '>=2' } })
    expect(validateInstall({ scan: makeScan(), component, installed: { '@agentskit/react': '1.9.0' } }).ok).toBe(false)
    expect(validateInstall({ scan: makeScan(), component, installed: { '@agentskit/react': '2.1.0' } }).ok).toBe(true)
    // workspace: + not-yet-installed both pass.
    expect(validateInstall({ scan: makeScan(), component, installed: { '@agentskit/react': 'workspace:*' } }).ok).toBe(true)
    expect(validateInstall({ scan: makeScan(), component, installed: {} }).ok).toBe(true)
  })

  it('errors when a Node/onnx port targets a server-less framework', () => {
    const component = makeComponent({
      frameworks: [{ uiBinding: 'react', metaFramework: 'vite' }],
      ports: { react: makePort() },
    })
    const r = validateInstall({ scan: makeScan({ metaFramework: 'vite' }), component })
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(expect.arrayContaining(['runtime-unsatisfiable', 'embedding-unsatisfiable']))
  })

  it('errors when a server-only secret would land in a client bundle', () => {
    const component = makeComponent({
      frameworks: [{ uiBinding: 'react', metaFramework: 'vite' }],
      ports: { react: makePort({ server: { delivery: 'bundled', runtimeRequirement: 'none', embeddingBackend: 'none', rateLimitBackend: 'memory' } }) },
      env: [{ name: 'OPENROUTER_API_KEY', description: '', required: true, scope: 'server' }],
    })
    const r = validateInstall({ scan: makeScan({ metaFramework: 'vite' }), component })
    expect(codes(r)).toContain('env-client-leak')
  })

  it('warns on memory rate-limit for serverless, ts-only on JS, and missing tailwind', () => {
    const ratelimit = validateInstall({
      scan: makeScan(),
      component: makeComponent({ ports: { react: makePort({ server: { delivery: 'bundled', runtimeRequirement: 'nodejs', embeddingBackend: 'onnx-node', rateLimitBackend: 'memory' } }) } }),
    })
    expect(ratelimit.ok).toBe(true)
    expect(codes(ratelimit)).toContain('ratelimit-memory')

    const jsProject = validateInstall({ scan: makeScan({ typescript: false }), component: makeComponent() })
    expect(jsProject.ok).toBe(false)
    expect(codes(jsProject)).toContain('language-ts-only')

    const tailwind = validateInstall({
      scan: makeScan(),
      component: makeComponent({ ports: { react: makePort({ stylingMode: 'tailwind-preset' }) } }),
    })
    expect(tailwind.ok).toBe(true)
    expect(codes(tailwind)).toContain('styling-tailwind')
  })
})
