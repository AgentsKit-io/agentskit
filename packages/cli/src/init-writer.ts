import { lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { InitCommandOptions, StarterKind, ToolKind, MemoryKind, PackageManager } from './init'
import type { Provider } from './init-providers'

type RenderContext = { template: StarterKind; provider: Provider; tools: ToolKind[]; memory: MemoryKind; pm: PackageManager }
type TemplateRenderer = (ctx: RenderContext) => Record<string, string>

const PACKAGE_RANGES: Record<string, string> = {
  '@agentskit/adapters': '^0.15.2', '@agentskit/angular': '^0.5.3', '@agentskit/ink': '^0.10.9',
  '@agentskit/memory': '^0.11.8', '@agentskit/react': '^0.8.3', '@agentskit/runtime': '^0.10.15',
  '@agentskit/skills': '^0.9.3', '@agentskit/svelte': '^0.5.3', '@agentskit/tools': '^0.13.6', '@agentskit/vue': '^0.5.3',
}

function align(files: Record<string, string>): Record<string, string> {
  const result = { ...files }
  for (const file of ['package.json', 'deno.json']) {
    if (!files[file]) continue
    const parsed = JSON.parse(files[file]!) as Record<string, unknown>
    const sections = file === 'package.json' ? ['dependencies', 'devDependencies', 'peerDependencies'] : ['imports']
    for (const sectionName of sections) {
      const section = parsed[sectionName]
      if (!section || typeof section !== 'object' || Array.isArray(section)) continue
      for (const [name, range] of Object.entries(PACKAGE_RANGES)) if (name in section) {
        (section as Record<string, unknown>)[name] = file === 'deno.json' ? `npm:${name}@${range}` : range
      }
    }
    result[file] = `${JSON.stringify(parsed, null, 2)}\n`
  }
  return result
}

async function existing(filePath: string) {
  try { return await lstat(filePath) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

export async function writeStarterProject(options: InitCommandOptions, renderers: Record<StarterKind, TemplateRenderer>): Promise<string[]> {
  const ctx: RenderContext = { template: options.template, provider: options.provider ?? 'demo', tools: options.tools ?? [], memory: options.memory ?? 'none', pm: options.packageManager ?? 'pnpm' }
  const files = align(renderers[ctx.template](ctx))
  await mkdir(options.targetDir, { recursive: true })
  const target = await lstat(options.targetDir)
  if (target.isSymbolicLink() || !target.isDirectory()) throw new Error(`Refusing to write starter into non-directory target: ${options.targetDir}`)
  if ((await readdir(options.targetDir)).length > 0 && !options.force) throw new Error(`Target directory is not empty: ${options.targetDir} (re-run with --force to overwrite generated files)`)
  const overwritten: string[] = []
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(options.targetDir, relativePath)
    await mkdir(path.dirname(absolutePath), { recursive: true })
    const destination = await existing(absolutePath)
    if (destination?.isSymbolicLink()) throw new Error(`Refusing to overwrite symlink: ${absolutePath}`)
    if (destination) overwritten.push(relativePath)
    const tempDir = await mkdtemp(path.join(path.dirname(absolutePath), `.agentskit-init-${randomUUID()}-`))
    try { await writeFile(path.join(tempDir, path.basename(absolutePath)), content, 'utf8'); await rename(path.join(tempDir, path.basename(absolutePath)), absolutePath) }
    finally { await rm(tempDir, { recursive: true, force: true }).catch(() => {}) }
  }
  return overwritten
}
