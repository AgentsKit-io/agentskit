/**
 * Deterministic classification + audit for AgentsKit product-chat surfaces.
 *
 * Product chats (Docs Ask + Registry Ask) must pin exact `@agentskit/chat@0.3.0`
 * and may only import supported subpaths. Legacy standalone packages
 * (`@agentskit/chat-protocol`, `@agentskit/chat-react`) are forbidden.
 *
 * Low-level binding examples (`@agentskit/react` demos, `apps/example-*`) are
 * educational only — they are excluded from product-chat adoption claims and
 * must not be treated as AgentsKit Chat framework hosts.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export const EXACT_CHAT_VERSION = '0.3.0'

export const LEGACY_CHAT_PACKAGES = Object.freeze([
  '@agentskit/chat-protocol',
  '@agentskit/chat-react',
])

/** Supported import specs for product-chat code (consolidated package only). */
export const ALLOWED_CHAT_IMPORT_SPECS = Object.freeze([
  '@agentskit/chat',
  '@agentskit/chat/protocol',
  '@agentskit/chat/react',
])

/**
 * Product-chat surfaces owned by this monorepo.
 * Only these roots are audited for Chat package adoption.
 */
export const PRODUCT_CHAT_SURFACES = Object.freeze([
  {
    id: 'docs-next',
    packageJson: 'apps/docs-next/package.json',
    roots: [
      'apps/docs-next/components/docs',
      'apps/docs-next/scripts',
      'apps/docs-next/tests',
      'apps/docs-next/lib',
    ],
  },
  {
    id: 'registry',
    packageJson: 'apps/registry/package.json',
    roots: [
      'apps/registry/components',
      'apps/registry/lib',
      'apps/registry/app',
    ],
  },
])

/**
 * Explicit low-level educational binding examples.
 * These may use `@agentskit/react` / framework packages without `@agentskit/chat`.
 * They are never product-chat hosts.
 */
export const LOW_LEVEL_BINDING_EXAMPLE_PREFIXES = Object.freeze([
  'apps/docs-next/components/examples/',
  'apps/example-',
])

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const IMPORT_SPEC_RE =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g

export function toPosix(path) {
  return path.split(sep).join('/')
}

export function isLowLevelBindingExample(relPath) {
  const posix = toPosix(relPath)
  return LOW_LEVEL_BINDING_EXAMPLE_PREFIXES.some((prefix) => {
    if (prefix.endsWith('/')) return posix.startsWith(prefix)
    // apps/example-*
    if (prefix.endsWith('-')) {
      return posix.startsWith(prefix) || posix.includes(`/${prefix}`)
    }
    return posix === prefix || posix.startsWith(`${prefix}/`)
  })
}

export function isChatRelatedSpec(spec) {
  return (
    spec === '@agentskit/chat' ||
    spec.startsWith('@agentskit/chat/') ||
    LEGACY_CHAT_PACKAGES.includes(spec) ||
    spec.startsWith('@agentskit/chat-protocol') ||
    spec.startsWith('@agentskit/chat-react')
  )
}

export function extractImportSpecs(sourceText) {
  const specs = new Set()
  for (const match of sourceText.matchAll(IMPORT_SPEC_RE)) {
    if (match[1]) specs.add(match[1])
  }
  return [...specs]
}

/**
 * @param {Record<string, unknown>} pkg
 * @param {string} relPath
 * @returns {string[]}
 */
export function auditPackageJson(pkg, relPath) {
  const violations = []
  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  }

  for (const legacy of LEGACY_CHAT_PACKAGES) {
    if (legacy in deps) {
      violations.push(`${relPath}: declares legacy package ${legacy}`)
    }
  }

  if (!('@agentskit/chat' in deps)) {
    violations.push(`${relPath}: product chat surface must declare @agentskit/chat`)
    return violations
  }

  const version = deps['@agentskit/chat']
  if (version !== EXACT_CHAT_VERSION) {
    violations.push(
      `${relPath}: @agentskit/chat must be exact "${EXACT_CHAT_VERSION}" (found ${JSON.stringify(version)})`,
    )
  }

  return violations
}

/**
 * @param {string} sourceText
 * @param {string} relPath
 * @returns {string[]}
 */
export function auditSourceFile(sourceText, relPath) {
  if (isLowLevelBindingExample(relPath)) return []

  const violations = []
  for (const spec of extractImportSpecs(sourceText)) {
    if (!isChatRelatedSpec(spec)) continue
    if (LEGACY_CHAT_PACKAGES.includes(spec) || spec.startsWith('@agentskit/chat-protocol/') || spec.startsWith('@agentskit/chat-react/')) {
      violations.push(`${relPath}: imports legacy package ${spec}`)
      continue
    }
    if (!ALLOWED_CHAT_IMPORT_SPECS.includes(spec)) {
      violations.push(
        `${relPath}: unsupported Chat import ${spec} (allowed: ${ALLOWED_CHAT_IMPORT_SPECS.join(', ')})`,
      )
    }
  }
  return violations
}

function walkFiles(absDir, out = []) {
  let entries
  try {
    entries = readdirSync(absDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next' || entry.name.startsWith('.')) {
      continue
    }
    const abs = join(absDir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(abs, out)
      continue
    }
    if (!entry.isFile()) continue
    const dot = entry.name.lastIndexOf('.')
    if (dot >= 0 && CODE_EXTENSIONS.has(entry.name.slice(dot))) out.push(abs)
  }
  return out
}

/**
 * @param {string} root
 * @param {{ readFile?: typeof readFileSync, walk?: typeof walkFiles }} [io]
 */
export function auditProductChatAdoption(root, io = {}) {
  const readFile = io.readFile ?? readFileSync
  const walk = io.walk ?? walkFiles
  const violations = []
  const auditedFiles = []

  for (const surface of PRODUCT_CHAT_SURFACES) {
    const pkgPath = join(root, surface.packageJson)
    try {
      const pkg = JSON.parse(readFile(pkgPath, 'utf8'))
      violations.push(...auditPackageJson(pkg, toPosix(surface.packageJson)))
    } catch (error) {
      violations.push(
        `${surface.packageJson}: unreadable (${error instanceof Error ? error.message : String(error)})`,
      )
    }

    for (const relRoot of surface.roots) {
      const absRoot = join(root, relRoot)
      try {
        if (!statSync(absRoot).isDirectory() && !statSync(absRoot).isFile()) continue
      } catch {
        continue
      }

      let files = []
      try {
        if (statSync(absRoot).isFile()) files = [absRoot]
        else files = walk(absRoot)
      } catch {
        continue
      }

      for (const abs of files) {
        const rel = toPosix(relative(root, abs))
        if (isLowLevelBindingExample(rel)) continue
        auditedFiles.push(rel)
        let text
        try {
          text = readFile(abs, 'utf8')
        } catch {
          continue
        }
        violations.push(...auditSourceFile(text, rel))
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    auditedFiles,
    exactChatVersion: EXACT_CHAT_VERSION,
    surfaces: PRODUCT_CHAT_SURFACES.map((s) => s.id),
    lowLevelBindingPrefixes: [...LOW_LEVEL_BINDING_EXAMPLE_PREFIXES],
  }
}
