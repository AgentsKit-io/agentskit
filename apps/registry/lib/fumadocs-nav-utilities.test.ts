import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../app/global.css', import.meta.url), 'utf8')
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
    for (const cls of headerClasses.filter((c) => /^(sticky|top-0|(z|h)-.*)$/.test(c))) expect(inline).toContain(cls)
  })
})
