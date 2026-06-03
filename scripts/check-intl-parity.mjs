#!/usr/bin/env node
/**
 * CI gate: documentation locale parity.
 *
 * AgentsKit docs are localized as sibling MDX routes (not key catalogs), with
 * a rollout status per locale in `apps/docs-next/lib/locales.ts`:
 *   planned → seed → partial → full
 *
 * A locale marked `full` claims complete coverage, so the gate *enforces* that
 * every English page under `content/docs/<locale>/` exists. `seed`/`partial`
 * locales are works-in-progress: their coverage is reported but never fails
 * the build. `planned` locales are skipped entirely.
 *
 * Today only EN (the default, root) is `full`, so this passes; it starts
 * biting the moment a locale graduates to `full` without finishing.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const docsRoot = join(root, 'apps/docs-next')
const localesFile = join(docsRoot, 'lib/locales.ts')
const contentRoot = join(docsRoot, 'content/docs')

if (!existsSync(localesFile) || !existsSync(contentRoot)) {
  console.log('Intl-parity gate skipped (docs-next locales/content not found).')
  process.exit(0)
}

// Parse LOCALES entries from locales.ts (code + status).
const src = readFileSync(localesFile, 'utf8')
const entryRe = /\{\s*code:\s*'([^']*)'[^}]*?status:\s*'(full|partial|seed|planned)'\s*\}/g
const locales = []
let m
while ((m = entryRe.exec(src))) locales.push({ code: m[1], status: m[2] })

// Localized content lives under content/docs/<code>/; default locale (code '')
// is the root content set.
const localeDirs = new Set(
  readdirSync(contentRoot, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name),
)

function listMdx(dir, base = '', out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    const relPath = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      // Skip locale subtrees when enumerating the default (English) set.
      if (!base && localeDirs.has(entry.name) && locales.some(l => l.code === entry.name)) continue
      listMdx(abs, relPath, out)
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      out.push(relPath)
    }
  }
  return out
}

const englishPages = listMdx(contentRoot)
const violations = []

for (const locale of locales) {
  if (!locale.code) continue // default/root = English baseline
  if (locale.status === 'planned') continue

  const localeRoot = join(contentRoot, locale.code)
  const present = existsSync(localeRoot) && statSync(localeRoot).isDirectory()
    ? new Set(listMdx(localeRoot))
    : new Set()

  const missing = englishPages.filter(p => !present.has(p))
  const coverage = englishPages.length
    ? Math.round(((englishPages.length - missing.length) / englishPages.length) * 100)
    : 100

  if (locale.status === 'full' && missing.length > 0) {
    violations.push(
      `${locale.code} is marked "full" but is missing ${missing.length}/${englishPages.length} pages, e.g. ${missing.slice(0, 5).join(', ')}`,
    )
  } else {
    console.log(`  ${locale.code} (${locale.status}): ${coverage}% — ${englishPages.length - missing.length}/${englishPages.length} pages`)
  }
}

if (violations.length > 0) {
  console.error('Locale parity failed for a "full" locale.')
  console.error('')
  for (const v of violations) console.error(`  ${v}`)
  console.error('')
  console.error(`${violations.length} violation(s).`)
  process.exit(1)
}

console.log(`Intl-parity gate clean (${englishPages.length} English pages; full locales complete).`)
