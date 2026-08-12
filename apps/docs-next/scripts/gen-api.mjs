#!/usr/bin/env node
// Auto-generate fumadocs-ready API reference MDX from TypeScript sources.
// Usage: pnpm --filter @agentskit/docs-next gen:api
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../..')
const OUT_ROOT = resolve(__dirname, '../content/docs/api')

const PACKAGES = [
  { name: 'core', entry: 'packages/core/src/index.ts' },
  { name: 'react', entry: 'packages/react/src/index.ts' },
  { name: 'runtime', entry: 'packages/runtime/src/index.ts' },
  { name: 'adapters', entry: 'packages/adapters/src/index.ts' },
  { name: 'tools', entry: 'packages/tools/src/index.ts' },
  { name: 'memory', entry: 'packages/memory/src/index.ts' },
  { name: 'rag', entry: 'packages/rag/src/index.ts' },
  { name: 'observability', entry: 'packages/observability/src/index.ts' },
]

function run(pkg) {
  const entry = resolve(ROOT, pkg.entry)
  if (!existsSync(entry)) {
    console.warn(`skip ${pkg.name}: ${entry} missing`)
    return false
  }
  const pkgTsconfig = resolve(ROOT, `packages/${pkg.name}/tsconfig.json`)
  if (!existsSync(pkgTsconfig)) {
    console.warn(`skip ${pkg.name}: ${pkgTsconfig} missing`)
    return false
  }
  const outDir = join(OUT_ROOT, pkg.name)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const args = [
    'typedoc',
    '--entryPoints',
    entry,
    '--tsconfig',
    pkgTsconfig,
    '--skipErrorChecking',
    'true',
    '--plugin',
    'typedoc-plugin-markdown',
    '--out',
    outDir,
    '--readme',
    'none',
    '--hideBreadcrumbs',
    'true',
    '--hidePageHeader',
    'true',
    '--useHTMLEncodedBrackets',
    'true',
    '--gitRevision',
    'main',
    '--githubPages',
    'false',
    '--excludePrivate',
    '--excludeInternal',
    '--excludeProtected',
    '--sort',
    'alphabetical',
  ]
  try {
    execFileSync('npx', args, { stdio: 'inherit', cwd: ROOT })
  } catch (err) {
    console.error(`typedoc failed for ${pkg.name}:`, err.message)
    return false
  }
  postprocess(outDir, pkg.name)
  return true
}

// Escape `{` `}` and bare `<` outside fenced code blocks so MDX doesn't parse them as expressions/tags.
function escapeMdx(raw) {
  const lines = raw.split('\n')
  let inFence = false
  return lines
    .map((line) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      return line
        .replace(/\\\{|\\\}|\{|\}/g, (m) => (m === '{' ? '\\{' : m === '}' ? '\\}' : m))
        .replace(/<(?=[A-Za-z][A-Za-z0-9_-]*[^>]*>)/g, '&lt;')
    })
    .join('\n')
}

function postprocess(dir, pkgName) {
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name)
      if (entry.isDirectory()) {
        walk(p)
        continue
      }
      if (!entry.name.endsWith('.md')) continue
      const raw = readFileSync(p, 'utf8')
      const isReadme = entry.name === 'README.md'
      const title = isReadme ? `@agentskit/${pkgName}` : entry.name.replace(/\.md$/, '')
      const description =
        pkgName === 'core' && title === 'ArgsValidator'
          ? 'ArgsValidator contract for validating TypeScript AI agent tool arguments against JSON Schema before execution.'
          : `Auto-generated API reference for ${title}.`
      const frontmatter = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`
      const body = escapeMdx(raw)
      const newPath = isReadme ? join(d, 'index.md') : p
      writeFileSync(newPath, frontmatter + body)
      if (newPath !== p) rmSync(p)
    }
  }
  walk(dir)
}

function writeMeta() {
  const available = PACKAGES.map((p) => p.name).filter((n) => existsSync(join(OUT_ROOT, n)))
  mkdirSync(OUT_ROOT, { recursive: true })
  writeFileSync(
    join(OUT_ROOT, 'meta.json'),
    JSON.stringify({ title: 'API', pages: available }, null, 2) + '\n',
  )
  writeFileSync(
    join(OUT_ROOT, 'index.mdx'),
    `---\ntitle: API reference\ndescription: Auto-generated from TypeScript sources via typedoc. Regenerate with \`pnpm --filter @agentskit/docs-next gen:api\`.\n---\n\nPick a package:\n\n${available
      .map((p) => `- [\`@agentskit/${p}\`](/docs/api/${p})`)
      .join('\n')}\n`,
  )
}

let ran = 0
for (const pkg of PACKAGES) if (run(pkg)) ran++
writeMeta()
console.log(`\ngen-api: generated ${ran}/${PACKAGES.length} packages → ${OUT_ROOT}`)
