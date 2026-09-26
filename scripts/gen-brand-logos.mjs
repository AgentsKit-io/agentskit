#!/usr/bin/env node
/**
 * Self-hosted brand logos for the sites' integration/provider marquees.
 *
 * Reads each app's `lib/brand-logos.json` manifest and writes one SVG per slug
 * to `public/logos/<slug>.svg` (brand colour) plus `<slug>-<hex>.svg` for every
 * per-theme tint, from the `simple-icons` npm package — the same markup
 * cdn.simpleicons.org serves, so the sites never depend on that CDN at runtime.
 *
 *   node scripts/gen-brand-logos.mjs          # regenerate
 *   node scripts/gen-brand-logos.mjs --check  # exit 1 when public/logos is stale
 *
 * Simple Icons is CC0-1.0; the logos remain trademarks of their owners (see
 * scripts/README.md).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import * as simpleIcons from 'simple-icons'

const root = resolve(import.meta.dirname, '..')
export const BRAND_LOGO_APPS = ['apps/docs-next', 'apps/registry']

const HEX = /^[0-9a-f]{6}$/

/** Map of every Simple Icons slug to its icon ({ title, hex, path, svg }). */
export function simpleIconsBySlug(icons = simpleIcons) {
  return new Map(Object.values(icons).filter((icon) => icon && typeof icon.slug === 'string').map((icon) => [icon.slug, icon]))
}

/** The file name a slug renders from, with an optional tint colour. */
export function logoFileName(slug, color) {
  return color ? `${slug}-${color}.svg` : `${slug}.svg`
}

/** The SVG markup cdn.simpleicons.org serves for `/<slug>[/<color>]`. */
export function logoSvg(icon, color = icon.hex) {
  return `<svg fill="#${color}" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>${escapeXml(icon.title)}</title><path d="${icon.path}"/></svg>\n`
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Every file a manifest needs, as a Map of file name → SVG. Throws on unknown slugs or bad tints. */
export function planLogos(manifest, bySlug) {
  const files = new Map()
  const slugs = new Set(manifest.slugs)
  for (const slug of manifest.slugs) {
    const icon = bySlug.get(slug)
    if (!icon) throw new Error(`brand-logos: "${slug}" is not a Simple Icons slug (remove it; the component renders a monogram)`)
    files.set(logoFileName(slug), logoSvg(icon))
  }
  for (const [slug, tint] of Object.entries(manifest.tint ?? {})) {
    if (!slugs.has(slug)) throw new Error(`brand-logos: tint for "${slug}", which is not in slugs`)
    for (const color of Object.values(tint)) {
      if (!HEX.test(color)) throw new Error(`brand-logos: tint "${color}" for "${slug}" must be 6 lowercase hex digits`)
      files.set(logoFileName(slug, color), logoSvg(bySlug.get(slug), color))
    }
  }
  return files
}

/** Differences between the planned files and `dir`: { missing, stale, extra } file names. */
export function diffLogos(files, dir) {
  const onDisk = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.svg')) : []
  return {
    missing: [...files.keys()].filter((name) => !onDisk.includes(name)),
    stale: [...files.keys()].filter((name) => onDisk.includes(name) && readFileSync(join(dir, name), 'utf8') !== files.get(name)),
    extra: onDisk.filter((name) => !files.has(name)),
  }
}

function main() {
  const check = process.argv.includes('--check')
  const bySlug = simpleIconsBySlug()
  let problems = 0
  for (const app of BRAND_LOGO_APPS) {
    const manifest = JSON.parse(readFileSync(join(root, app, 'lib/brand-logos.json'), 'utf8'))
    const files = planLogos(manifest, bySlug)
    const dir = join(root, app, 'public/logos')
    const diff = diffLogos(files, dir)
    const changed = diff.missing.length + diff.stale.length + diff.extra.length
    if (check) {
      if (changed) {
        problems += changed
        console.error(`${relative(root, dir)} is out of date: ${JSON.stringify(diff)} — run node scripts/gen-brand-logos.mjs`)
      }
      continue
    }
    mkdirSync(dir, { recursive: true })
    for (const name of diff.extra) rmSync(join(dir, name))
    for (const [name, svg] of files) writeFileSync(join(dir, name), svg)
    console.log(`${relative(root, dir)}: ${files.size} logos (${changed} changed)`)
  }
  if (problems) process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
