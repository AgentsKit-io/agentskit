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
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'dist/package.json'), 'utf8')) as {
      types: string
      main: string
      module: string
      exports: { '.': { types: string, import: string, default: string } }
    }
    const packageRoot = join(process.cwd(), 'dist')
    const artifactPath = (target: string) => target.startsWith('./dist/')
      ? join(process.cwd(), target)
      : join(packageRoot, target)
    await expect(access(artifactPath(manifest.exports['.'].types))).resolves.toBeUndefined()
    await expect(access(artifactPath(manifest.exports['.'].import))).resolves.toBeUndefined()
    await expect(access(artifactPath(manifest.exports['.'].default))).resolves.toBeUndefined()
  })

})
