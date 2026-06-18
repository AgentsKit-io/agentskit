/**
 * `.agentskit/components.json` — build / read / write (RFC-0006 D3).
 *
 * `agentskit init` writes this file once; every later `add` reads it and skips
 * scanning. This module derives a sensible default `ComponentsConfig` from a
 * {@link ProjectScan}, and (de)serializes it. Pure + injectable I/O so it is
 * unit-testable; the interactive `init` command wires these together with prompts.
 */
import { join } from 'node:path'
import type { ComponentsConfig, MetaFramework, ProjectScan } from './types'

/** Where the config lives, relative to the project (or workspace package) root. */
export const CONFIG_PATH = '.agentskit/components.json'

/** Pinned, fetchable in v1 (the hosted registry URL becomes an alias later, D3). */
export const SCHEMA_URL =
  'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/v1/schema/components.json'

export const DEFAULT_REGISTRY = 'https://registry.agentskit.io'

/** Idiomatic server route directory per meta-framework. */
const SERVER_DIR_BY_META: Record<MetaFramework, string> = {
  'next-app': 'app/api',
  'next-pages': 'pages/api',
  remix: 'app/routes',
  'tanstack-start': 'app/routes',
  astro: 'src/pages/api',
  sveltekit: 'src/routes/api',
  nuxt: 'server/api',
  'angular-ssr': 'src/server',
  expo: 'server',
  vite: 'server',
  cra: 'server',
  'angular-spa': 'server',
  node: 'server',
  none: 'server',
}

function joinPath(base: string, sub: string): string {
  return base ? `${base}/${sub}` : sub
}

/**
 * Derive a default {@link ComponentsConfig} from a scan. The values are
 * best-effort, framework-idiomatic defaults the user can edit; `init` may override
 * any of them via prompts. Falls back gracefully when the scan is `unknown`.
 */
export function buildConfig(scan: ProjectScan): ComponentsConfig {
  const uiBinding = scan.uiBinding === 'unknown' ? 'react' : scan.uiBinding
  const metaFramework = scan.metaFramework === 'unknown' ? 'none' : scan.metaFramework
  const srcBase = scan.srcDir ?? ''

  const componentsPath = joinPath(srcBase, 'components')
  const libPath = joinPath(srcBase, 'lib')
  // Next respects a `src/` dir for its router; prefix the server path when present.
  const rawServer = SERVER_DIR_BY_META[metaFramework]
  const serverPath =
    srcBase && (metaFramework === 'next-app' || metaFramework === 'next-pages') && !rawServer.startsWith('src/')
      ? joinPath(srcBase, rawServer)
      : rawServer

  const alias = scan.importAlias

  return {
    $schema: SCHEMA_URL,
    schemaVersion: 1,
    uiBinding,
    metaFramework,
    typescript: scan.typescript,
    styling: {
      mode: scan.styling.mode,
      css: scan.styling.cssEntry ?? 'app/globals.css',
      tailwindConfig: null,
    },
    aliases: {
      // components + lib are import-aliased when the project has one; the server
      // route is a framework-routed filesystem location, so it mirrors its path.
      components: alias ? `${alias}/components` : `./${componentsPath}`,
      lib: alias ? `${alias}/lib` : `./${libPath}`,
      server: serverPath,
    },
    paths: {
      root: scan.monorepo?.root ?? '.',
      components: componentsPath,
      lib: libPath,
      server: serverPath,
    },
    registries: { default: DEFAULT_REGISTRY },
  }
}

/** Serialize a config to pretty JSON (with a trailing newline, matching editors). */
export function serializeConfig(config: ComponentsConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`
}

/** Parse + shallow-validate a config string. Returns `null` on malformed input. */
export function parseConfig(raw: string): ComponentsConfig | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const c = data as Partial<ComponentsConfig>
  if (typeof c.schemaVersion !== 'number' || !c.uiBinding || !c.metaFramework || !c.registries) {
    return null
  }
  return c as ComponentsConfig
}

/** Injectable config I/O — `read` returns file contents or `null`; `write` persists. */
export interface ConfigIo {
  read: (path: string) => string | null
  write: (path: string, content: string) => void
}

/** Read the committed config under `root`, or `null` when absent/malformed. */
export function readConfig(io: ConfigIo, root = '.'): ComponentsConfig | null {
  const raw = io.read(join(root, CONFIG_PATH))
  return raw == null ? null : parseConfig(raw)
}

/** Write the config under `root`, returning the path written. */
export function writeConfig(io: ConfigIo, config: ComponentsConfig, root = '.'): string {
  const path = join(root, CONFIG_PATH)
  io.write(path, serializeConfig(config))
  return path
}

/**
 * Resolve the effective config: the committed one when present (zero prompts),
 * else a default derived from the scan. The boolean reports whether it was loaded
 * from disk (vs. freshly derived → the caller should suggest running `init`).
 */
export function resolveConfig(
  io: ConfigIo,
  scan: ProjectScan,
  root = '.',
): { config: ComponentsConfig; fromDisk: boolean } {
  const existing = readConfig(io, root)
  if (existing) return { config: existing, fromDisk: true }
  return { config: buildConfig(scan), fromDisk: false }
}
