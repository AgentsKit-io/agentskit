import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('@agentskit/statechart package contract', () => {
  it('publishes a zero-dependency dual ESM/CJS beta package', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      type: string
      sideEffects: boolean
      main: string
      module: string
      types: string
      dependencies?: Record<string, string>
      agentskit: { stability: string }
      exports: Record<string, { types: string; import: string; require: string }>
    }

    expect(pkg.type).toBe('module')
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.dependencies ?? {}).toEqual({})
    expect(pkg.exports['.']).toEqual({
      types: pkg.types,
      import: pkg.module,
      require: pkg.main,
    })
    expect(pkg.agentskit.stability).toBe('beta')
  })

  it('uses named exports only', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    for (const name of [
      'createStatechartInstance',
      'defineStatechart',
      'notifyStatechartObserver',
      'restoreStatechart',
      'serializeStatechart',
      'transitionStatechart',
      'STATECHART_SNAPSHOT_VERSION',
      'StatechartDiagnosticCodes',
      'StatechartError',
    ]) {
      expect(mod[name as keyof typeof mod], name).toBeDefined()
    }
  })
})
