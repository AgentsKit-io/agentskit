import { describe, expect, it } from 'vitest'
import { scanProject, type ScanFs } from '../src/components/scan'

/**
 * Build an in-memory {@link ScanFs} from a map of relative path → file contents
 * plus a list of directory paths. Paths are relative to root `'.'` (the scanner's
 * default), so e.g. `package.json` and `app` match the scanner's `join('.', …)`.
 */
function fakeFs(files: Record<string, string>, dirs: string[] = []): ScanFs {
  const dirSet = new Set(dirs)
  return {
    readFile: (path) => (path in files ? files[path]! : null),
    exists: (path) => path in files || dirSet.has(path),
  }
}

function pkg(deps: Record<string, string>, dev: Record<string, string> = {}): string {
  return JSON.stringify({ dependencies: deps, devDependencies: dev })
}

describe('scanProject', () => {
  it('detects a Next.js App Router + React + pnpm + tailwind + alias + src', () => {
    const fs = fakeFs(
      {
        'package.json': pkg({ next: '15.0.0', react: '19.0.0', tailwindcss: '3.4.0' }),
        'pnpm-lock.yaml': '',
        'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
        'app/globals.css': '',
      },
      ['app', 'src'],
    )
    const scan = scanProject(fs)
    expect(scan.uiBinding).toBe('react')
    expect(scan.metaFramework).toBe('next-app')
    expect(scan.packageManager).toBe('pnpm')
    expect(scan.typescript).toBe(true)
    expect(scan.srcDir).toBe('src')
    expect(scan.importAlias).toBe('@')
    expect(scan.styling).toEqual({ mode: 'tailwind-preset', cssEntry: 'app/globals.css' })
    expect(scan.monorepo).toBeNull()
  })

  it('detects Next Pages Router when there is no app/ dir', () => {
    const fs = fakeFs({ 'package.json': pkg({ next: '14.0.0', react: '18.0.0' }) }, ['pages'])
    expect(scanProject(fs).metaFramework).toBe('next-pages')
  })

  it('detects SvelteKit', () => {
    const fs = fakeFs(
      { 'package.json': pkg({ svelte: '5.0.0' }, { '@sveltejs/kit': '2.0.0' }), 'yarn.lock': '' },
      [],
    )
    const scan = scanProject(fs)
    expect(scan.uiBinding).toBe('svelte')
    expect(scan.metaFramework).toBe('sveltekit')
    expect(scan.packageManager).toBe('yarn')
  })

  it('detects Nuxt as vue', () => {
    const fs = fakeFs({ 'package.json': pkg({ nuxt: '3.13.0', vue: '3.5.0' }) })
    const scan = scanProject(fs)
    expect(scan.uiBinding).toBe('vue')
    expect(scan.metaFramework).toBe('nuxt')
  })

  it('distinguishes Angular SSR from SPA', () => {
    const ssr = scanProject(
      fakeFs({ 'package.json': pkg({ '@angular/core': '19.0.0', '@angular/ssr': '19.0.0' }) }),
    )
    expect(ssr.uiBinding).toBe('angular')
    expect(ssr.metaFramework).toBe('angular-ssr')

    const spa = scanProject(fakeFs({ 'package.json': pkg({ '@angular/core': '19.0.0' }) }))
    expect(spa.metaFramework).toBe('angular-spa')
  })

  it('detects Expo / React Native (never misread as plain react)', () => {
    const fs = fakeFs({ 'package.json': pkg({ expo: '52.0.0', react: '19.0.0', 'react-native': '0.76.0' }) })
    const scan = scanProject(fs)
    expect(scan.uiBinding).toBe('react-native')
    expect(scan.metaFramework).toBe('expo')
  })

  it('detects a Vite + React SPA', () => {
    const fs = fakeFs({ 'package.json': pkg({ react: '19.0.0' }, { vite: '6.0.0' }) }, ['src'])
    const scan = scanProject(fs)
    expect(scan.uiBinding).toBe('react')
    expect(scan.metaFramework).toBe('vite')
  })

  it('detects Ink as a node target', () => {
    const scan = scanProject(fakeFs({ 'package.json': pkg({ ink: '5.0.0', react: '18.0.0' }) }))
    expect(scan.uiBinding).toBe('ink')
    expect(scan.metaFramework).toBe('node')
  })

  it('detects a pnpm monorepo + tailwind via config file (not a dep)', () => {
    const fs = fakeFs(
      { 'package.json': pkg({ react: '19.0.0' }), 'pnpm-workspace.yaml': '', 'tailwind.config.ts': '' },
      [],
    )
    const scan = scanProject(fs)
    expect(scan.monorepo).toEqual({ tool: 'pnpm', root: '.' })
    expect(scan.styling.mode).toBe('tailwind-preset')
  })

  it('falls back to unknown/defaults (no throw) when package.json is missing or invalid', () => {
    const empty = scanProject(fakeFs({}))
    expect(empty.uiBinding).toBe('unknown')
    expect(empty.metaFramework).toBe('unknown')
    expect(empty.packageManager).toBe('npm')
    expect(empty.typescript).toBe(false)
    expect(empty.srcDir).toBeNull()
    expect(empty.importAlias).toBeNull()
    expect(empty.styling).toEqual({ mode: 'data-attrs-only', cssEntry: null })
    expect(empty.monorepo).toBeNull()

    const broken = scanProject(fakeFs({ 'package.json': '{ not valid json' }))
    expect(broken.uiBinding).toBe('unknown')
  })
})
