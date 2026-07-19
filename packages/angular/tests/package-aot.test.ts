import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('@agentskit/angular package output', () => {
  it('publishes partial-Ivy declarations for AOT consumers', async () => {
    const output = await readFile(join(process.cwd(), 'dist/fesm2022/agentskit-angular.mjs'), 'utf8')
    expect(output).toContain('ɵɵngDeclareComponent')
    expect(output).toContain('ɵɵngDeclareInjectable')
    expect(output).not.toContain('__decorateClass')
  })

  it('exports the generated declaration entry for monorepo + packed consumers', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
      types: string
      main: string
      module: string
      exports: { '.': { types: string, import: string, default: string } }
    }
    expect(manifest.exports['.'].types).toBe(manifest.types)
    expect(manifest.exports['.'].import).toBe(manifest.main)
    expect(manifest.exports['.'].default).toBe(manifest.module)
    expect(manifest.types).toBe('./dist/types/agentskit-angular.d.ts')
    expect(manifest.main).toBe('./dist/fesm2022/agentskit-angular.mjs')
    await expect(access(join(process.cwd(), manifest.types))).resolves.toBeUndefined()
    await expect(access(join(process.cwd(), manifest.main))).resolves.toBeUndefined()
  })

})
