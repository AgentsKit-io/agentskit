import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwind from '@tailwindcss/postcss'
import postcss from 'postcss'
import { beforeAll, describe, expect, it } from 'vitest'

const cssPath = fileURLToPath(new URL('../app/global.css', import.meta.url))
const header = readFileSync(new URL('../node_modules/fumadocs-ui/dist/layouts/home/slots/header.js', import.meta.url), 'utf8')

// Production is a vinext build that does not scan fumadocs-ui, so the utilities of its sticky
// header and nav rows must be forced into the stylesheet. Missing `z-40` left the header at
// z-index:auto (contrast-header 1:1); missing `max-sm:hidden`/`max-lg:hidden` overflowed mobile.
describe('fumadocs home header utilities (compiled CSS)', () => {
  let output = ''
  beforeAll(async () => {
    // source(none): disable file scanning so only the `@source inline` safelist can emit utilities,
    // as in the vinext production build (otherwise this test file's own text would satisfy it).
    const source = readFileSync(cssPath, 'utf8').replace("@import 'tailwindcss'", "@import 'tailwindcss' source(none)")
    const result = await postcss([tailwind()]).process(source, { from: cssPath })
    output = result.css
  }, 60_000)

  const headerClasses = /"(sticky[^"]*)"/.exec(header)?.[1].split(/\s+/) ?? []
  const esc = (c: string) => c.replace(/([:/])/g, '\\$1')

  it('finds the sticky header classes in fumadocs-ui', () => {
    expect(headerClasses).toContain('z-40')
  })

  it('emits the stacking and sizing utilities', () => {
    expect(output).toContain('.z-40')
    expect(output).toContain('.h-14')
    for (const cls of headerClasses.filter((c) => /^(z|h)-/.test(c))) expect(output).toContain(`.${esc(cls)}`)
  })

  // The preset scans fumadocs-ui locally (so the compile above passes), but the vinext production
  // build does not: the `@source inline` safelist is what ships these utilities there.
  it('safelists every nav and header utility via @source inline', () => {
    const inline = /@source inline\("([^"]*)"\)/.exec(readFileSync(cssPath, 'utf8'))?.[1].split(/\s+/) ?? []
    for (const cls of ['max-sm:hidden', 'max-lg:hidden', ...headerClasses.filter((c) => /^(z|h)-/.test(c))]) {
      expect(inline).toContain(cls)
    }
  })

  it('emits the responsive hide utilities that prevent mobile overflow', () => {
    expect(output).toContain('.max-sm\\:hidden')
    expect(output).toContain('.max-lg\\:hidden')
  })
})
