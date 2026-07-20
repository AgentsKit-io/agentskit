import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(here, '..')

const OPTIONAL_PEERS = [
  'langfuse',
  'langsmith',
  '@opentelemetry/api',
  '@opentelemetry/sdk-trace-base',
  '@opentelemetry/exporter-trace-otlp-http',
] as const

describe('observability package manifest + distribution', () => {
  it('declares optional peerDependencies aligned with devDependencies ranges', () => {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')) as {
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: boolean }>
      devDependencies?: Record<string, string>
    }

    for (const name of OPTIONAL_PEERS) {
      expect(pkg.peerDependencies?.[name], `peer ${name}`).toBeDefined()
      expect(pkg.peerDependenciesMeta?.[name]?.optional, `meta ${name}`).toBe(true)
      expect(pkg.devDependencies?.[name], `dev ${name}`).toBe(pkg.peerDependencies?.[name])
    }

    // Preserve langfuse and do not alter package privacy/version in this wave.
    expect(pkg.peerDependencies?.langfuse).toBe('^3.38.20')
  })

  it('tsup externalizes optional SDK packages', () => {
    const src = readFileSync(join(pkgRoot, 'tsup.config.ts'), 'utf8')
    for (const name of [
      'langsmith',
      '@opentelemetry/api',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/exporter-trace-otlp-http',
      'langfuse',
    ]) {
      expect(src).toContain(`'${name}'`)
    }
  })

  it('built artifacts do not embed langsmith or opentelemetry SDK sources', () => {
    const dist = join(pkgRoot, 'dist')
    if (!existsSync(dist)) return

    const entryFiles = ['index.js', 'index.cjs', 'langfuse.js', 'langfuse.cjs'].filter((f) =>
      existsSync(join(dist, f)),
    )
    expect(entryFiles.length).toBeGreaterThan(0)

    for (const file of entryFiles) {
      const body = readFileSync(join(dist, file), 'utf8')
      // External imports are fine; bundled package path crumbs are not.
      expect(body.includes('node_modules/langsmith'), file).toBe(false)
      expect(body.includes('node_modules/@opentelemetry/sdk-trace-base'), file).toBe(false)
      expect(body.includes('node_modules/@opentelemetry/exporter-trace-otlp-http'), file).toBe(
        false,
      )
      // Entry must dynamic-import peers rather than inline them.
      if (file.startsWith('index')) {
        expect(body).toMatch(/import\(['"]langsmith['"]\)/)
        expect(body).toMatch(/import\(['"]@opentelemetry\/api['"]\)/)
      }
    }

    // Stale bundled SDK chunks must not ship after clean builds.
    const stale = readdirSync(dist).filter(
      (f) => f.startsWith('langsmith-') || f.startsWith('getMachineId-'),
    )
    expect(stale).toEqual([])
  })
})
