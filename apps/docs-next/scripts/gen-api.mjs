#!/usr/bin/env node
// Auto-generate grouped Fumadocs API reference pages from TypeScript sources.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../..')
const OUT_ROOT = resolve(__dirname, '../content/docs/api')
const ROUTES_FILE = resolve(__dirname, '../lib/api-symbol-routes.json')

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

const toPosix = (path) => path.split(sep).join('/')
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function run(pkg) {
  const entry = resolve(ROOT, pkg.entry)
  const pkgTsconfig = resolve(ROOT, `packages/${pkg.name}/tsconfig.json`)
  if (!existsSync(entry) || !existsSync(pkgTsconfig)) {
    console.warn(`skip ${pkg.name}: entry or tsconfig missing`)
    return false
  }
  const outDir = join(OUT_ROOT, pkg.name)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  const args = [
    'typedoc', '--entryPoints', entry, '--tsconfig', pkgTsconfig,
    '--skipErrorChecking', 'true', '--plugin', 'typedoc-plugin-markdown',
    '--out', outDir, '--readme', 'none', '--hideBreadcrumbs', 'true',
    '--hidePageHeader', 'true', '--useHTMLEncodedBrackets', 'true',
    '--gitRevision', 'main', '--githubPages', 'false', '--excludePrivate',
    '--excludeInternal', '--excludeProtected', '--sort', 'alphabetical',
  ]
  try {
    execFileSync('npx', args, { stdio: 'inherit', cwd: ROOT })
  } catch (err) {
    console.error(`typedoc failed for ${pkg.name}:`, err.message)
    return false
  }
  return true
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.md') ? [path] : []
  })
}

function escapeMdx(raw) {
  let inFence = false
  return raw.split('\n').map((line) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    return line
      .replace(/\\\{|\\\}|\{|\}/g, (m) => (m === '{' ? '\\{' : m === '}' ? '\\}' : m))
      .replace(/<(?=[A-Za-z][A-Za-z0-9_-]*[^>]*>)/g, '&lt;')
  }).join('\n')
}

function generatePackage(pkg) {
  const dir = join(OUT_ROOT, pkg.name)
  const files = walk(dir)
  const symbols = files.filter((file) => relative(dir, file).includes(sep))
    .map((file) => {
      const rel = toPosix(relative(dir, file))
      const [category, ...rest] = rel.split('/')
      const name = rest.join('/').replace(/\.md$/, '')
      const raw = readFileSync(file, 'utf8')
      const title = raw.match(/^# (.+)$/m)?.[1] ?? name
      const anchor = slug(title)
      return { file, rel, category, name, title, anchor, raw }
    })
  const byRel = new Map(symbols.map((symbol) => [symbol.rel, symbol]))
  const groups = new Map()
  const routes = {}

  for (const symbol of symbols) {
    const href = `/docs/api/${pkg.name}/${symbol.category}#${symbol.anchor}`
    routes[`api/${pkg.name}/${symbol.category}/${symbol.name}`] = href
    const linksFixed = symbol.raw.replace(/\]\(([^)#]+\.md)(#[^)]*)?\)/g, (match, target, hash = '') => {
      const relTarget = toPosix(normalize(join(dirname(symbol.rel), target)))
      const linked = byRel.get(relTarget)
      if (!linked) return match
      return `](/docs/api/${pkg.name}/${linked.category}#${linked.anchor}${hash})`
    })
    const body = escapeMdx(linksFixed).replace(/^# (.+)$/m, `<a id="${symbol.anchor}"></a>\n\n## $1`)
    if (!groups.has(symbol.category)) groups.set(symbol.category, [])
    groups.get(symbol.category).push({ ...symbol, body })
  }

  const categories = [...groups.keys()].sort()
  for (const [category, entries] of groups) {
    entries.sort((a, b) => a.name.localeCompare(b.name))
    const title = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const content = `---\ntitle: ${JSON.stringify(`@agentskit/${pkg.name} — ${title}`)}\ndescription: ${JSON.stringify(`API ${title.toLowerCase()} for @agentskit/${pkg.name}.`)}\n---\n\n${entries.map((entry) => entry.body).join('\n\n---\n\n')}\n`
    writeFileSync(join(dir, `${category}.md`), content)
  }

  for (const file of files) rmSync(file)
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) rmSync(join(dir, entry.name), { recursive: true, force: true })
  }
  const title = `@agentskit/${pkg.name}`
  const links = categories.map((category) => {
    const label = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return `- [${label}](/docs/api/${pkg.name}/${category}) — ${groups.get(category).length} symbols`
  }).join('\n')
  writeFileSync(join(dir, 'index.mdx'), `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(`Public API reference for ${title}. Browse symbols by category.`)}\n---\n\nBrowse the generated API by category.\n\n${links}\n`)
  return { categories, symbols, routes }
}

let ran = 0
const packagePages = []
const allRoutes = {}
for (const pkg of PACKAGES) {
  if (!run(pkg)) continue
  const generated = generatePackage(pkg)
  packagePages.push(pkg.name)
  Object.assign(allRoutes, generated.routes)
  ran++
}

mkdirSync(OUT_ROOT, { recursive: true })
writeFileSync(join(OUT_ROOT, 'meta.json'), JSON.stringify({ title: 'API', pages: packagePages }, null, 2) + '\n')
writeFileSync(join(OUT_ROOT, 'index.mdx'), `---\ntitle: API reference\ndescription: Generated from public TypeScript sources.\n---\n\nChoose a package:\n\n${packagePages.map((pkg) => `- [\`@agentskit/${pkg}\`](/docs/api/${pkg})`).join('\n')}\n`)
// A partial run must not drop legacy symbol redirects from the committed map.
if (ran === PACKAGES.length) writeFileSync(ROUTES_FILE, JSON.stringify(allRoutes, null, 2) + '\n')
else console.warn(`gen-api: kept ${ROUTES_FILE} because only ${ran}/${PACKAGES.length} packages generated`)
console.log(`\ngen-api: generated ${ran}/${PACKAGES.length} packages, ${Object.keys(allRoutes).length} symbol routes → ${OUT_ROOT}`)
