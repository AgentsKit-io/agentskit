#!/usr/bin/env node
// Broken-link checker for content/docs MDX/MD.
// Resolves internal /docs paths and ./ relatives; skips external URLs unless --external is passed.
// Exits 1 on any broken link.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DOCS = resolve(ROOT, 'content/docs')
const CHECK_REMOTE = process.argv.includes('--external')

const SKIP_DIRS = new Set(['api'])
const SKIP_FILES = new Set([
  join(DOCS, 'reference/changelog.mdx'),
  join(DOCS, 'production/performance.mdx'),
])

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      out.push(...walk(join(dir, e.name)))
    } else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
      out.push(join(dir, e.name))
    }
  }
  return out
}

const files = walk(DOCS)

const urlToFile = new Map()
for (const file of files) {
  const rel = relative(DOCS, file).replace(/\\/g, '/')
  const withoutExt = rel.replace(/\.(mdx|md)$/, '')
  const url =
    withoutExt === 'index'
      ? '/docs'
      : withoutExt.endsWith('/index')
        ? '/docs/' + withoutExt.slice(0, -'/index'.length)
        : '/docs/' + withoutExt
  urlToFile.set(url, file)
}

const errors = []
let checked = 0

function stripCode(src) {
  let out = ''
  let inFence = false
  let marker = ''
  for (const line of src.split('\n')) {
    const t = line.trimStart()
    const m = t.match(/^(`{3,}|~{3,})/)
    if (m) {
      if (!inFence) {
        inFence = true
        marker = m[1]
      } else if (t.startsWith(marker)) {
        inFence = false
      }
      out += '\n'
      continue
    }
    if (inFence) {
      out += '\n'
      continue
    }
    out += line.replace(/`[^`]*`/g, '') + '\n'
  }
  return out
}

function headingsIn(src) {
  const ids = new Set()
  const counts = new Map()
  for (const line of src.split('\n')) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*(?:\{#([^}]+)\})?\s*$/)
    if (!h) continue
    if (h[2]) {
      ids.add(h[2])
      continue
    }
    const base = h[1]
      .replace(/`/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    if (!base) continue
    const n = counts.get(base) ?? 0
    counts.set(base, n + 1)
    ids.add(n === 0 ? base : `${base}-${n}`)
  }
  return ids
}

async function reachable(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (res.status < 400) return true
    const g = await fetch(url, { method: 'GET', redirect: 'follow' })
    return g.status < 400
  } catch {
    return false
  }
}

for (const file of files) {
  if (SKIP_FILES.has(file)) continue
  const raw = readFileSync(file, 'utf8')
  const body = stripCode(raw)
  const ids = headingsIn(raw)

  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = linkRe.exec(body))) {
    checked++
    let href = m[1].trim().split(/\s+/)[0]
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue

    if (href.startsWith('#')) {
      const anchor = href.slice(1)
      if (!ids.has(anchor)) errors.push({ file, href, reason: `anchor #${anchor} not on page` })
      continue
    }

    if (/^https?:\/\//.test(href)) {
      if (!CHECK_REMOTE) continue
      const ok = await reachable(href)
      if (!ok) errors.push({ file, href, reason: 'external URL returned 4xx/5xx or unreachable' })
      continue
    }

    if (href.startsWith('/')) {
      const [path, hash] = href.split('#')
      if (!path.startsWith('/docs')) continue
      const cleaned = path.replace(/\/$/, '') || '/docs'
      if (!urlToFile.has(cleaned)) {
        errors.push({ file, href, reason: 'internal doc path does not exist' })
        continue
      }
      if (hash) {
        const target = urlToFile.get(cleaned)
        const targetIds = headingsIn(readFileSync(target, 'utf8'))
        if (!targetIds.has(hash)) errors.push({ file, href, reason: `anchor #${hash} missing in target` })
      }
      continue
    }

    if (href.startsWith('.')) {
      const [path, hash] = href.split('#')
      const abs = resolve(dirname(file), path)
      const candidates = [abs, abs + '.mdx', abs + '.md', join(abs, 'index.mdx'), join(abs, 'index.md')]
      const found = candidates.find((c) => existsSync(c) && statSync(c).isFile())
      if (!found) {
        errors.push({ file, href, reason: 'relative link target not found' })
      } else if (hash) {
        const targetIds = headingsIn(readFileSync(found, 'utf8'))
        if (!targetIds.has(hash)) errors.push({ file, href, reason: `anchor #${hash} missing in ${relative(ROOT, found)}` })
      }
    }
  }
}

if (errors.length) {
  console.error('\n✗ broken links:\n')
  for (const e of errors) {
    console.error(`  ${relative(ROOT, e.file)}`)
    console.error(`    -> ${e.href}`)
    console.error(`    ${e.reason}\n`)
  }
  console.error(`${errors.length} broken / ${checked} checked.`)
  process.exit(1)
}
console.log(`ok link check passed (${checked} links across ${files.length} files${CHECK_REMOTE ? ', including external' : ''}).`)
