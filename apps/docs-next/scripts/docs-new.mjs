#!/usr/bin/env node
// Scaffold a new docs page and register it in the nearest meta.json.
// Usage: node scripts/docs-new.mjs <kind> <slug> [--title "Title"] [--description "..."] [--dir custom/path]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DOCS = resolve(ROOT, 'content/docs')

const KINDS = {
  recipe: { dir: 'cookbook', template: recipeTpl },
  cookbook: { dir: 'cookbook', template: recipeTpl },
  guide: { dir: 'get-started', template: guideTpl },
  reference: { dir: 'reference/recipes', template: recipeTpl },
  page: { dir: null, template: pageTpl },
}

const [kind, slug, ...rest] = process.argv.slice(2)
if (!kind || !slug) {
  console.error('usage: docs:new <kind> <slug> [--title "…"] [--description "…"] [--dir relative/path]')
  console.error('kinds: ' + Object.keys(KINDS).join(', '))
  process.exit(1)
}
const kindDef = KINDS[kind]
if (!kindDef) {
  console.error(`unknown kind "${kind}". valid: ${Object.keys(KINDS).join(', ')}`)
  process.exit(1)
}

const opts = { title: undefined, description: undefined, dir: kindDef.dir }
for (let i = 0; i < rest.length; i++) {
  const arg = rest[i]
  const next = rest[i + 1]
  if (arg === '--title') { opts.title = next; i++ }
  else if (arg === '--description') { opts.description = next; i++ }
  else if (arg === '--dir') { opts.dir = next; i++ }
}

if (!opts.dir) {
  console.error('--dir is required for kind "page"')
  process.exit(1)
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('slug must be kebab-case (lowercase letters, digits, hyphens)')
  process.exit(1)
}

const title = opts.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const description = opts.description ?? `${title} — short description of what this page covers.`

const targetDir = resolve(DOCS, opts.dir)
const targetFile = join(targetDir, `${slug}.mdx`)
mkdirSync(targetDir, { recursive: true })
// `wx` flag: atomic create that fails if the file already exists,
// instead of a racy exists-then-write check.
try {
  writeFileSync(targetFile, kindDef.template({ title, description, slug }), { flag: 'wx' })
} catch (err) {
  if (err.code === 'EEXIST') {
    console.error(`✗ ${relative(ROOT, targetFile)} already exists`)
    process.exit(1)
  }
  throw err
}
console.log(`✓ created ${relative(ROOT, targetFile)}`)

// Register in meta.json if one sits alongside.
const metaPath = join(targetDir, 'meta.json')
let metaRaw
try {
  metaRaw = readFileSync(metaPath, 'utf8')
} catch (err) {
  if (err.code !== 'ENOENT') throw err
}
if (metaRaw !== undefined) {
  const meta = JSON.parse(metaRaw)
  meta.pages = Array.isArray(meta.pages) ? meta.pages : []
  if (!meta.pages.includes(slug)) {
    meta.pages.push(slug)
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n')
    console.log(`✓ registered in ${relative(ROOT, metaPath)}`)
  }
} else {
  console.log(`ℹ no meta.json in ${relative(ROOT, targetDir)} — skipping registration`)
}

function recipeTpl({ title, description }) {
  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

Short, self-contained. Drop into a real file, wire to your stack, ship.

\`\`\`tsx
// TODO: minimum viable code for this recipe
\`\`\`

<Tip>TODO: one-line takeaway.</Tip>

## See also

- TODO: related recipes or reference pages.
`
}

function guideTpl({ title, description }) {
  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

TODO: 2–3 sentence summary of the guide.

## What you'll build

TODO: concrete outcome.

## Steps

1. TODO first step
2. TODO second step
3. TODO third step

## Next

- TODO: link to the follow-up page.
`
}

function pageTpl({ title, description }) {
  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

TODO: page body.
`
}
