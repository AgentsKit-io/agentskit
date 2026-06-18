/**
 * Registry fetch client with per-file integrity (RFC-0006 D9/D14).
 *
 * Resolves a component identifier (`name` / `@org/name` / `https://…`) to a
 * registry base + item id, fetches the manifest at the pinned ref, and fetches
 * each port file (inline content or per-path), verifying a SHA-256 over every file
 * and aborting the WHOLE install on any mismatch. Private registries authenticate
 * via `components.json` `registryAuth` (base URL → env var name) — never an argv
 * token. The signed-manifest check is an injected `signatureVerifier` seam (the
 * minisign/Ed25519 primitive lands in its own slice, tested against a real key).
 *
 * Network access is injected (`FetchLike`) so the whole client is unit-testable
 * with no real requests.
 */
import { createHash } from 'node:crypto'
import type { ComponentPort, ComponentsConfig, RegistryComponent } from './types'
import { IntegrityError, type FileToWrite } from './install'

/** Highest registry `schemaVersion` this CLI understands. */
export const SUPPORTED_SCHEMA_VERSION = 1

export const DEFAULT_REGISTRY = 'https://registry.agentskit.io'

export interface FetchResponseLike {
  ok: boolean
  status: number
  text: () => Promise<string>
}
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchResponseLike>

/** A resolved registry location for one item. */
export interface RegistryRef {
  base: string
  itemId: string
}

export interface ResolveOptions {
  /** `--registry` override (highest precedence). */
  registryBase?: string
}

/**
 * Resolve an identifier to a {@link RegistryRef} (D9):
 *   - `https://…/r/foo.json` → that URL's directory as base, `foo` as the item;
 *   - `@org/name` → `config.registries[org]` as base, `name` as the item;
 *   - `name` → the default registry (`--registry` > `registries.default`).
 */
export function resolveIdentifier(
  identifier: string,
  config: Pick<ComponentsConfig, 'registries'> | undefined,
  options: ResolveOptions = {},
): RegistryRef {
  const registries = config?.registries ?? {}

  if (/^https?:\/\//.test(identifier)) {
    // Direct URL to a manifest: strip `/r/<id>.json` (or any trailing file) → base.
    const m = identifier.match(/^(.*?)\/r\/([^/]+?)(?:\.json)?$/)
    if (m) return { base: m[1]!, itemId: m[2]! }
    const url = new URL(identifier)
    const id = url.pathname.split('/').filter(Boolean).pop()?.replace(/\.json$/, '') ?? identifier
    return { base: `${url.origin}`, itemId: id }
  }

  if (identifier.startsWith('@')) {
    const slash = identifier.indexOf('/')
    if (slash < 0) throw new IntegrityError(`invalid namespaced identifier: ${identifier}`)
    const org = identifier.slice(1, slash)
    const name = identifier.slice(slash + 1)
    const base = registries[org]
    if (!base) throw new IntegrityError(`unknown registry namespace "@${org}" — add it to components.json registries`)
    return { base, itemId: name }
  }

  const base = options.registryBase ?? registries.default ?? DEFAULT_REGISTRY
  return { base, itemId: identifier }
}

/**
 * Authorization header for a private registry: `registryAuth` maps a base URL to
 * the ENV VAR NAME holding its bearer token (D9 — secret never in the file, never
 * in argv). Returns `{}` when no match or the env var is unset.
 */
export function resolveAuthHeader(
  base: string,
  config: Pick<ComponentsConfig, 'registryAuth'> | undefined,
  env: Record<string, string | undefined> = {},
): Record<string, string> {
  const map = config?.registryAuth
  if (!map) return {}
  for (const [registryBase, envVar] of Object.entries(map)) {
    if (base.startsWith(registryBase)) {
      const token = env[envVar]
      if (token) return { authorization: `Bearer ${token}` }
    }
  }
  return {}
}

/** Lowercase hex SHA-256 of a string. */
export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/** Throw {@link IntegrityError} listing every file whose content fails its sha256. */
export function verifyChecksums(files: ReadonlyArray<{ path: string; content: string; sha256: string }>): void {
  const bad = files.filter((f) => sha256Hex(f.content) !== f.sha256).map((f) => f.path)
  if (bad.length > 0) {
    throw new IntegrityError(`checksum mismatch — install aborted for ${bad.length} file(s): ${bad.join(', ')}`)
  }
}

export interface FetchOptions extends ResolveOptions {
  fetchImpl?: FetchLike
  env?: Record<string, string | undefined>
  config?: Pick<ComponentsConfig, 'registries' | 'registryAuth'>
  /**
   * Optional signed-manifest verifier (D9). Receives the raw manifest JSON and the
   * raw signature; returns whether it is valid. When provided, a manifest that
   * fails verification aborts the fetch. The minisign signature path is
   * `<manifest-url>.minisig`.
   */
  signatureVerifier?: (manifestRaw: string, signatureRaw: string) => Promise<boolean>
}

function manifestUrl(ref: RegistryRef): string {
  return `${ref.base}/r/${ref.itemId}.json`
}
function fileUrl(ref: RegistryRef, path: string): string {
  return `${ref.base}/r/${ref.itemId}/${path}`
}

async function getText(fetchImpl: FetchLike, url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetchImpl(url, { headers })
  if (!res.ok) throw new IntegrityError(`fetch failed (${res.status}) for ${url}`)
  return res.text()
}

/** Fetch + parse + integrity/version-gate the component manifest. */
export async function fetchManifest(identifier: string, options: FetchOptions = {}): Promise<{
  ref: RegistryRef
  component: RegistryComponent
}> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)
  const ref = resolveIdentifier(identifier, options.config, options)
  const headers = resolveAuthHeader(ref.base, options.config, options.env)

  const raw = await getText(fetchImpl, manifestUrl(ref), headers)

  if (options.signatureVerifier) {
    const sig = await getText(fetchImpl, `${manifestUrl(ref)}.minisig`, headers)
    const ok = await options.signatureVerifier(raw, sig)
    if (!ok) throw new IntegrityError(`manifest signature verification failed for ${ref.itemId}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new IntegrityError(`manifest is not valid JSON for ${ref.itemId}`)
  }
  const component = parsed as RegistryComponent
  if (component?.kind !== 'component') {
    throw new IntegrityError(`"${ref.itemId}" is not a component (kind=${String((component as { kind?: string })?.kind)})`)
  }
  if (typeof component.schemaVersion !== 'number' || component.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    throw new IntegrityError(
      `"${ref.itemId}" needs a newer CLI (schemaVersion ${component.schemaVersion} > ${SUPPORTED_SCHEMA_VERSION})`,
    )
  }
  return { ref, component }
}

/**
 * Fetch a port's files — inline `content` when present, else per-path — verify the
 * SHA-256 of every file, and return them ready for `commitFiles`. Aborts the whole
 * set on any mismatch (D14/D9). `target` overrides are preserved on each file.
 */
export async function fetchPortFiles(
  ref: RegistryRef,
  port: ComponentPort,
  options: FetchOptions = {},
): Promise<FileToWrite[]> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)
  const headers = resolveAuthHeader(ref.base, options.config, options.env)

  const resolved = await Promise.all(
    port.files.map(async (f) => {
      const content = f.content ?? (await getText(fetchImpl, fileUrl(ref, f.path), headers))
      return { path: f.path, content, sha256: f.sha256 }
    }),
  )

  verifyChecksums(resolved)
  return resolved.map((f) => ({ path: f.path, content: f.content }))
}
