#!/usr/bin/env node
// Snapshot every docs page's MDX (frontmatter title/description + body) for /llms-full.txt, so the
// route needs no filesystem at request time (Cloudflare Workers has none). Runs in prebuild, after
// gen-api (which writes content/docs/api).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = join(appRoot, 'content/docs')
const out = join(appRoot, 'lib/llms-full-pages.generated.json')

// Each entry carries its path segments under content/docs, so the URL slug is built from
// segments rather than by rewriting OS separators.
const walk = (dir, segments = []) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name)
  if (statSync(p).isDirectory()) return walk(p, [...segments, name])
  return /\.mdx?$/.test(name) ? [{ file: p, rel: [...segments, name.replace(/\.mdx?$/, '')].join('/') }] : []
})

const pages = {}
for (const { file, rel } of walk(contentDir)) {
  const slug = rel === 'index' ? '' : rel.replace(/\/index$/, '')
  const raw = readFileSync(file, 'utf8')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) { pages[slug] ??= { body: raw.trim() }; continue }
  const [, fm, body] = m
  const field = (k) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.replace(/^['"]|['"]$/g, '')
  // `<slug>.mdx` wins over `<slug>/index.mdx`, as the route's lookup order did.
  if (!pages[slug] || !rel.endsWith('/index')) pages[slug] = { body: body.trim(), title: field('title'), description: field('description') }
}
writeFileSync(out, `${JSON.stringify(pages)}\n`)
console.log(`llms-full: ${Object.keys(pages).length} pages → ${relative(appRoot, out)}`)
