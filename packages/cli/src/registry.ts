/**
 * AgentsKit Registry client — fetches ready-made agents from the registry and
 * copies their source into the user's project (shadcn-style; the user owns the
 * code). Sources, in order:
 *   1. Hosted index   — https://registry.agentskit.io/r/<id>.json (meta + inlined sources)
 *   2. Raw GitHub      — the registry repo's registry/<id>/ files (works before hosting is live)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const RAW_BASE = 'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main'
// The committed, prebuilt index (fast path) — served straight from the repo, no
// separate deploy. Falls back to walking the agent source below.
const HOSTED_BASE = `${RAW_BASE}/public/r`

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
  /** draft agents are catalog-only until promoted to validated. */
  status?: 'draft' | 'validated' | 'deprecated'
  installable?: boolean
  /** Inline skill for `--run` (data only). Null for agents that compose tools. */
  skill?: RegistrySkill | null
}

export interface RegistrySkill {
  name: string
  description: string
  systemPrompt: string
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

/**
 * Resolve an agent's runnable systemPrompt — from the hosted `skill` field, or
 * by extracting the inline skill from the fetched `agent.ts` source (raw-GitHub
 * fallback). Returns null for tool-composing agents (no inline prompt).
 */
export function resolveSystemPrompt(agent: RegistryAgent): string | null {
  if (agent.skill?.systemPrompt) return agent.skill.systemPrompt
  const src = agent.sources.find((f) => f.path === 'agent.ts')?.content
  if (!src) return null
  const m = src.match(/systemPrompt:\s*`((?:\\.|[^`\\])*)`/)
  return m ? m[1].replace(/\\`/g, '`').replace(/\\\$\{/g, '${') : null
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

function assertInstallable(agent: RegistryAgent): void {
  if (agent.status === 'draft' || agent.installable === false) {
    throw new Error(
      `"${agent.id}" is a catalog draft — not installable yet. ` +
        `Browse the roadmap at https://registry.agentskit.io/r/catalog.json`,
    )
  }
  if (agent.status === 'deprecated') {
    throw new Error(`"${agent.id}" is deprecated and no longer installable from the registry.`)
  }
}

/** Fetch an agent and write its source files into the project. */
export async function addAgent(id: string, options: AddOptions = {}): Promise<AddResult> {
  const agent = await fetchAgent(id, options)
  assertInstallable(agent)
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

// ---------------------------------------------------------------------------
// diff / update — keep a copied agent in sync with the registry (shadcn-style)
// ---------------------------------------------------------------------------

export type DiffLine = { type: ' ' | '-' | '+'; text: string }

/** Minimal line-level diff (LCS) — no dependency. */
export function lineDiff(a: string, b: string): DiffLine[] {
  const x = a.split('\n')
  const y = b.split('\n')
  const m = x.length
  const n = y.length
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (x[i] === y[j]) {
      out.push({ type: ' ', text: x[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: '-', text: x[i++] })
    } else {
      out.push({ type: '+', text: y[j++] })
    }
  }
  while (i < m) out.push({ type: '-', text: x[i++] })
  while (j < n) out.push({ type: '+', text: y[j++] })
  return out
}

export interface FileDiff {
  path: string
  status: 'unchanged' | 'modified' | 'missing-local'
  diff?: DiffLine[]
  upstream: string
}

export interface DiffAgentOptions extends FetchOptions {
  outDir?: string
  readFileImpl?: (path: string) => Promise<string | null>
}

/** Compare a locally-copied agent against the registry's current source. */
export async function diffAgent(id: string, options: DiffAgentOptions = {}): Promise<{
  agent: RegistryAgent
  targetDir: string
  files: FileDiff[]
}> {
  const agent = await fetchAgent(id, options)
  const targetDir = join(options.outDir ?? 'agents', id)
  const readLocal =
    options.readFileImpl ??
    (async (p: string) => {
      const { readFile } = await import('node:fs/promises')
      try {
        return await readFile(p, 'utf8')
      } catch {
        return null
      }
    })

  const files: FileDiff[] = []
  for (const f of agent.sources) {
    const local = await readLocal(join(targetDir, f.path))
    if (local == null) {
      files.push({ path: f.path, status: 'missing-local', upstream: f.content })
    } else if (local === f.content) {
      files.push({ path: f.path, status: 'unchanged', upstream: f.content })
    } else {
      files.push({ path: f.path, status: 'modified', diff: lineDiff(local, f.content), upstream: f.content })
    }
  }
  return { agent, targetDir, files }
}
