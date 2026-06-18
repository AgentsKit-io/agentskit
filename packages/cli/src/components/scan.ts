/**
 * Project scanner (RFC-0006 D3/D4).
 *
 * Inspects a project directory and produces a {@link ProjectScan}: the UI binding,
 * meta-framework, package manager, TypeScript flag, source dir, import alias,
 * styling, and monorepo signals that `agentskit add` needs when there is no
 * committed `.agentskit/components.json`. Pure + deterministic + dependency-light:
 * all filesystem access goes through an injectable {@link ScanFs}, so it is fully
 * unit-testable with an in-memory tree and never guesses silently — ambiguous
 * signals resolve to `'unknown'`/`null` and surface later in validation.
 */
import { join } from 'node:path'
import type {
  MetaFramework,
  PackageManager,
  ProjectScan,
  UiBinding,
} from './types'

/** The only filesystem surface the scanner needs. Injectable for tests. */
export interface ScanFs {
  /** Return the file contents, or `null` if it does not exist / can't be read. */
  readFile: (path: string) => string | null
  /** Whether a file or directory exists at `path`. */
  exists: (path: string) => boolean
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/** Merge all dependency buckets into one name→range map. */
function allDeps(pkg: PackageJson | null): Record<string, string> {
  if (!pkg) return {}
  return { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies }
}

function readJson<T>(fs: ScanFs, path: string): T | null {
  const raw = fs.readFile(path)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function detectPackageManager(fs: ScanFs, root: string): PackageManager {
  if (fs.exists(join(root, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.exists(join(root, 'bun.lockb')) || fs.exists(join(root, 'bun.lock'))) return 'bun'
  if (fs.exists(join(root, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

/**
 * UI binding from dependencies. Order matters: react-native and the various
 * meta-framework UI libs must be checked before the bare `react`/`vue` they build
 * on, so `expo`/`react-native` is never misread as plain `react`.
 */
function detectUiBinding(deps: Record<string, string>): UiBinding | 'unknown' {
  const has = (name: string): boolean => name in deps
  if (has('react-native') || has('expo')) return 'react-native'
  if (has('@angular/core')) return 'angular'
  if (has('svelte')) return 'svelte'
  if (has('nuxt') || has('vue')) return 'vue'
  if (has('solid-js')) return 'solid'
  if (has('ink')) return 'ink'
  if (has('react')) return 'react'
  return 'unknown'
}

/**
 * Meta-framework — decides WHERE a server file lands. Distinguishes app vs pages
 * router (Next), SSR vs SPA (Angular), and the no-server bundlers (vite/cra).
 */
function detectMetaFramework(
  fs: ScanFs,
  root: string,
  deps: Record<string, string>,
  uiBinding: UiBinding | 'unknown',
): MetaFramework | 'unknown' {
  const has = (name: string): boolean => name in deps
  const hasPrefix = (prefix: string): boolean => Object.keys(deps).some((d) => d.startsWith(prefix))

  if (has('next')) {
    // App Router when an `app/` (or `src/app/`) dir exists, else Pages Router.
    if (fs.exists(join(root, 'app')) || fs.exists(join(root, 'src/app'))) return 'next-app'
    return 'next-pages'
  }
  if (hasPrefix('@remix-run/')) return 'remix'
  if (has('@tanstack/react-start') || has('@tanstack/start')) return 'tanstack-start'
  if (has('@sveltejs/kit')) return 'sveltekit'
  if (has('nuxt')) return 'nuxt'
  if (has('astro')) return 'astro'
  if (uiBinding === 'angular') {
    return has('@angular/ssr') || has('@angular/platform-server') ? 'angular-ssr' : 'angular-spa'
  }
  if (has('expo')) return 'expo'
  if (has('react-scripts')) return 'cra'
  if (has('vite')) return 'vite'
  if (uiBinding === 'ink') return 'node'
  if (uiBinding === 'unknown') return 'unknown'
  return 'none'
}

/** First `@/*`-style alias from tsconfig `compilerOptions.paths`, sans `/*`. */
function detectImportAlias(fs: ScanFs, root: string): string | null {
  const tsconfig = readJson<{ compilerOptions?: { paths?: Record<string, string[]> } }>(
    fs,
    join(root, 'tsconfig.json'),
  )
  const paths = tsconfig?.compilerOptions?.paths
  if (!paths) return null
  for (const key of Object.keys(paths)) {
    // e.g. "@/*" → "@", "~/*" → "~". Skip exact (non-wildcard) mappings.
    if (key.endsWith('/*')) return key.slice(0, -2)
  }
  return null
}

const CSS_ENTRY_CANDIDATES = [
  'app/globals.css',
  'app/global.css',
  'src/app/globals.css',
  'src/index.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'src/app.css',
  'src/styles.css',
]

function detectStyling(
  fs: ScanFs,
  root: string,
  deps: Record<string, string>,
): ProjectScan['styling'] {
  const tailwind =
    'tailwindcss' in deps ||
    fs.exists(join(root, 'tailwind.config.ts')) ||
    fs.exists(join(root, 'tailwind.config.js')) ||
    fs.exists(join(root, 'tailwind.config.cjs')) ||
    fs.exists(join(root, 'tailwind.config.mjs'))
  let cssEntry: string | null = null
  for (const candidate of CSS_ENTRY_CANDIDATES) {
    if (fs.exists(join(root, candidate))) {
      cssEntry = candidate
      break
    }
  }
  return { mode: tailwind ? 'tailwind-preset' : 'data-attrs-only', cssEntry }
}

function detectMonorepo(fs: ScanFs, root: string): ProjectScan['monorepo'] {
  if (fs.exists(join(root, 'pnpm-workspace.yaml'))) return { tool: 'pnpm', root }
  if (fs.exists(join(root, 'turbo.json'))) return { tool: 'turbo', root }
  if (fs.exists(join(root, 'nx.json'))) return { tool: 'nx', root }
  return null
}

/**
 * Scan `root` and return the detected {@link ProjectScan}. Never throws — a
 * missing/unparseable `package.json` yields an all-`unknown`/default scan that the
 * validator then reports, rather than a crash or a silent wrong guess.
 */
export function scanProject(fs: ScanFs, root = '.'): ProjectScan {
  const pkg = readJson<PackageJson>(fs, join(root, 'package.json'))
  const deps = allDeps(pkg)

  const uiBinding = detectUiBinding(deps)
  const metaFramework = detectMetaFramework(fs, root, deps, uiBinding)
  const srcDir = fs.exists(join(root, 'src')) ? 'src' : null

  return {
    uiBinding,
    metaFramework,
    packageManager: detectPackageManager(fs, root),
    typescript: fs.exists(join(root, 'tsconfig.json')),
    srcDir,
    importAlias: detectImportAlias(fs, root),
    styling: detectStyling(fs, root, deps),
    monorepo: detectMonorepo(fs, root),
  }
}
