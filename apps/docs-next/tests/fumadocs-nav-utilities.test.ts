import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwind from '@tailwindcss/postcss'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const cssPath = fileURLToPath(new URL('../app/global.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')
const header = readFileSync(new URL('../node_modules/fumadocs-ui/dist/layouts/home/slots/header.js', import.meta.url), 'utf8')

// Production is a vinext build that does not scan fumadocs-ui, so the utilities of its sticky
// header must be forced into the stylesheet. Missing `z-40` left the header at z-index:auto and
// the home hero painted over the whole nav (contrast-header measured 1:1 on production).
describe('fumadocs home header utilities', () => {
  const inline = /@source inline\("([^"]*)"\)/.exec(css)?.[1].split(/\s+/) ?? []
  const headerClasses = /"(sticky[^"]*)"/.exec(header)?.[1].split(/\s+/) ?? []

  it('finds the sticky header classes in fumadocs-ui', () => {
    expect(headerClasses).toContain('z-40')
  })

  it('forces the stacking and sizing utilities into the stylesheet', () => {
    for (const cls of headerClasses.filter((c) => /^(z|h)-/.test(c))) expect(inline).toContain(cls)
  })

  // The @source string alone does not prove the build emits the rules: compile the stylesheet with
  // the same Tailwind postcss plugin the builds use. The production stylesheet that kept the
  // Ecosystem visual check red had `.sticky`/`.top-0` but no `.z-40`/`.h-14` rule. Scanning an
  // empty directory proves global.css alone forces them (this file names the classes too).
  it('emits the header utility rules when the stylesheet is compiled', async () => {
    const base = mkdtempSync(join(tmpdir(), 'fumadocs-nav-css-'))
    try {
      const { css: compiled } = await postcss([tailwind({ base })]).process(css, { from: cssPath })
      for (const cls of ['z-40', 'h-14']) expect(compiled).toMatch(new RegExp(`\\.${cls}\\s*\\{`))
      expect(compiled).toMatch(/\.max-sm\\:hidden\s*\{/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  }, 60_000)
})
