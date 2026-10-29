import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, describe, expect, it } from 'vitest'

const run = promisify(execFile)
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
    await run('pnpm', ['pack', '--pack-destination', packDir], { cwd: packageRoot })
    const [tarball] = await readdir(packDir)

    consumerRoot = join(work, 'consumer')
    const scopeDir = join(consumerRoot, 'node_modules', '@agentskit')
    const installed = join(scopeDir, 'angular')
    await mkdir(installed, { recursive: true })
    await run('tar', ['-xzf', join(packDir, tarball), '--strip-components=1', '-C', installed])

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
    const tsc = join(await realpath(join(packageRoot, 'node_modules', 'typescript')), 'bin', 'tsc')
    await expect(run(process.execPath, [tsc, '-p', tsconfig], { cwd: root })).resolves.toBeDefined()
  }, 120_000)
})
