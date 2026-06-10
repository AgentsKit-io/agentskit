/**
 * AgentsKit Registry client — fetches ready-made agents from the registry and
 * copies their source into the user's project (shadcn-style; the user owns the
 * code). Sources, in order:
 *   1. Hosted index   — https://registry.agentskit.io/r/<id>.json (meta + inlined sources)
 *   2. Raw GitHub      — the registry repo's registry/<id>/ files (works before hosting is live)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const HOSTED_BASE = 'https://registry.agentskit.io/r'
const RAW_BASE = 'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main'

export interface RegistryEnvVar {
  name: string
  description: string
  required?: boolean
}

export interface RegistryFile {
  path: string
  content: string
}

export interface RegistryAgent {
  id: string
  title: string
  description: string
  category: string
  packages: string[]
  env?: RegistryEnvVar[]
  files: string[]
  sources: RegistryFile[]
}

export interface FetchOptions {
  /** Injectable fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function getText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.text()
}

/** Fetch an agent descriptor with inlined file sources, hosted first then raw GitHub. */
export async function fetchAgent(id: string, options: FetchOptions = {}): Promise<RegistryAgent> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  try {
    const hosted = (await getJson(`${HOSTED_BASE}/${id}.json`, fetchImpl)) as RegistryAgent
    if (hosted?.sources?.length) return hosted
    throw new Error('hosted entry missing sources')
  } catch {
    // Fallback: read the repo source directly (no hosting required).
    const meta = (await getJson(`${RAW_BASE}/registry/${id}/meta.json`, fetchImpl)) as Omit<
      RegistryAgent,
      'sources'
    >
    const sources = await Promise.all(
      meta.files.map(async (rel) => ({
        path: rel,
        content: await getText(`${RAW_BASE}/registry/${id}/${rel}`, fetchImpl),
      })),
    )
    return { ...meta, sources }
  }
}

export interface AddOptions extends FetchOptions {
  /** Directory to write the agent into. Default `./agents`. */
  outDir?: string
  /** Overwrite existing files. Default false. */
  force?: boolean
  /** Injectable writer (tests). */
  writeFileImpl?: (path: string, content: string) => Promise<void>
  /** Injectable existence check (tests). */
  existsImpl?: (path: string) => Promise<boolean>
}

export interface AddResult {
  agent: RegistryAgent
  written: string[]
  targetDir: string
}

async function defaultExists(path: string): Promise<boolean> {
  const { access } = await import('node:fs/promises')
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Fetch an agent and write its source files into the project. */
export async function addAgent(id: string, options: AddOptions = {}): Promise<AddResult> {
  const agent = await fetchAgent(id, options)
  const baseDir = options.outDir ?? 'agents'
  const targetDir = join(baseDir, id)
  const exists = options.existsImpl ?? defaultExists
  const write =
    options.writeFileImpl ??
    (async (path: string, content: string) => {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content, 'utf8')
    })

  const written: string[] = []
  for (const file of agent.sources) {
    const dest = join(targetDir, file.path)
    if (!options.force && (await exists(dest))) {
      throw new Error(`${dest} already exists (re-run with --force to overwrite)`)
    }
    await write(dest, file.content)
    written.push(dest)
  }
  return { agent, written, targetDir }
}
