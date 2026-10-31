import { runCommand } from '@agentskit/cross-platform'
import { mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'

const packageRoot = process.cwd()

const resolutions = [
  { name: 'bundler', module: 'ESNext', moduleResolution: 'bundler' },
  { name: 'node16', module: 'node16', moduleResolution: 'node16' },
] as const

describe('@agentskit/angular packed consumer typings', () => {
  let work: string
  let consumerRoot: string

  afterAll(async () => {
    if (work) await rm(work, { recursive: true, force: true })
  })

  async function prepareConsumer(): Promise<string> {
    if (consumerRoot) return consumerRoot
    work = await mkdtemp(join(tmpdir(), 'ak-angular-consumer-'))
    const packDir = join(work, 'pack')
    await mkdir(packDir)
    const packed = await runCommand('pnpm', ['pack', '--pack-destination', packDir], { cwd: packageRoot })
    expect(packed.code, packed.stderr).toBe(0)
    const [tarball] = await readdir(packDir)

    consumerRoot = join(work, 'consumer')
    const scopeDir = join(consumerRoot, 'node_modules', '@agentskit')
    const installed = join(scopeDir, 'angular')
    await mkdir(installed, { recursive: true })
    const extracted = await runCommand('tar', ['-xzf', join(packDir, tarball), '--strip-components=1', '-C', installed])
    expect(extracted.code, extracted.stderr).toBe(0)

    // Peer + runtime deps come from the workspace (offline install).
    const link = async (name: string, from: string) => {
      const target = join(consumerRoot, 'node_modules', name)
      await mkdir(join(target, '..'), { recursive: true })
      await symlink(await realpath(join(packageRoot, 'node_modules', from)), target, 'dir')
    }
    await link('@agentskit/core', '@agentskit/core')
    await link('@angular/core', '@angular/core')
    await link('rxjs', 'rxjs')
    await link('tslib', 'tslib')

    // The package is ESM-only; an ESM consumer is the supported node16 case.
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(
      join(consumerRoot, 'index.ts'),
      [
        "import { AgentskitChat, ChatContainerComponent } from '@agentskit/angular'",
        'export const service: typeof AgentskitChat = AgentskitChat',
        'export const component: typeof ChatContainerComponent = ChatContainerComponent',
        '',
      ].join('\n'),
    )
    return consumerRoot
  }

  it.each(resolutions)('type-checks the public API under $name resolution', async (r) => {
    const root = await prepareConsumer()
    const tsconfig = join(root, `tsconfig.${r.name}.json`)
    await writeFile(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: r.module,
          moduleResolution: r.moduleResolution,
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          experimentalDecorators: true,
          types: [],
        },
        files: ['index.ts'],
      }),
    )
    const config = ts.getParsedCommandLineOfConfigFile(tsconfig, undefined, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: diagnostic => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      },
    })
    const program = ts.createProgram({ rootNames: config!.fileNames, options: config!.options })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(
      ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: name => name,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }),
    ).toBe('')
  }, 120_000)
})
