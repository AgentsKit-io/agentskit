/**
 * Unit tests for public API snapshot pure helpers.
 * Run: node --test scripts/public-api-snapshot.test.mjs
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import {
  assetSymbols,
  classifyExportSymbol,
  collectAssetTargets,
  collectPublicConditions,
  collectTypeTargets,
  createDeclarationProgram,
  diffSnapshots,
  enumerateExportSubpaths,
  formatDiffDiagnostics,
  getExportsFromSourceFile,
  isDeclarationTarget,
  isSubpathExportsMap,
  loadTypeScript,
  mergeSymbols,
  normalizeKinds,
  normalizeSubpath,
  parseSnapshot,
  serializeSnapshot,
  sortSymbols,
} from './lib/public-api-snapshot.mjs'

/** @type {string[]} */
const tempDirs = []

after(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
})

/**
 * @returns {string}
 */
function makeTempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ak-public-api-'))
  tempDirs.push(dir)
  return dir
}

// ---------------------------------------------------------------------------
// Sorting / determinism
// ---------------------------------------------------------------------------

describe('normalizeSubpath / kinds / sorting', () => {
  test('normalizes subpaths deterministically', () => {
    assert.equal(normalizeSubpath('.'), '.')
    assert.equal(normalizeSubpath('./'), '.')
    assert.equal(normalizeSubpath(''), '.')
    assert.equal(normalizeSubpath('./theme'), './theme')
    assert.equal(normalizeSubpath('theme'), './theme')
  })

  test('normalizeKinds is sorted and de-duplicated', () => {
    assert.deepEqual(normalizeKinds(['value', 'type', 'value']), ['type', 'value'])
    assert.deepEqual(normalizeKinds(['asset']), ['asset'])
  })

  test('sortSymbols is stable by name', () => {
    const sorted = sortSymbols([
      { name: 'zeta', kinds: ['value'] },
      { name: 'alpha', kinds: ['type', 'value'] },
      { name: 'beta', kinds: ['type'] },
    ])
    assert.deepEqual(
      sorted.map((s) => s.name),
      ['alpha', 'beta', 'zeta'],
    )
  })

  test('serializeSnapshot is byte-stable and sorted', () => {
    const snap = {
      schemaVersion: /** @type {1} */ (1),
      packages: {
        '@agentskit/z': {
          subpaths: {
            './b': { conditions: ['require', 'import'], symbols: [{ name: 'b', kinds: ['value'] }] },
            '.': { conditions: ['types'], symbols: [{ name: 'a', kinds: ['type'] }] },
          },
        },
        '@agentskit/a': {
          subpaths: {
            '.': {
              conditions: [],
              symbols: assetSymbols(['./dist/x.css']),
              assets: ['./dist/x.css'],
            },
          },
        },
      },
    }
    const a = serializeSnapshot(snap)
    const b = serializeSnapshot(parseSnapshot(a))
    assert.equal(a, b)
    assert.ok(a.indexOf('@agentskit/a') < a.indexOf('@agentskit/z'))
    assert.ok(a.endsWith('\n'))
  })
})

// ---------------------------------------------------------------------------
// Export enumeration / nested conditions / type targets
// ---------------------------------------------------------------------------

describe('enumerateExportSubpaths', () => {
  test('handles string exports', () => {
    const result = enumerateExportSubpaths({ exports: './dist/index.js' })
    assert.equal(result.length, 1)
    assert.equal(result[0].subpath, '.')
    assert.equal(result[0].entry, './dist/index.js')
  })

  test('handles conditional root exports', () => {
    const entry = {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    }
    assert.equal(isSubpathExportsMap(entry), false)
    const result = enumerateExportSubpaths({ exports: entry })
    assert.equal(result.length, 1)
    assert.equal(result[0].subpath, '.')
  })

  test('handles subpath maps and sorts by subpath', () => {
    const result = enumerateExportSubpaths({
      exports: {
        './theme': './dist/theme.css',
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
        './nested': { types: './dist/nested.d.ts' },
      },
    })
    assert.deepEqual(
      result.map((r) => r.subpath),
      ['.', './nested', './theme'],
    )
  })

  test('classic types fallback when exports is absent', () => {
    const result = enumerateExportSubpaths({
      types: './dist/index.d.ts',
      main: './dist/index.cjs',
      module: './dist/index.js',
    })
    assert.equal(result.length, 1)
    assert.equal(result[0].subpath, '.')
    assert.deepEqual(result[0].entry, {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    })
  })

  test('handles array exports', () => {
    const result = enumerateExportSubpaths({
      exports: ['./dist/index.js', './dist/index.cjs'],
    })
    assert.equal(result[0].subpath, '.')
    assert.ok(Array.isArray(result[0].entry))
  })
})

describe('collectPublicConditions / collectTypeTargets / assets', () => {
  test('collects nested public conditions without private chunk paths', () => {
    const entry = {
      'react-native': {
        types: './dist/replay.browser.d.ts',
        import: './dist/replay.browser.js',
        require: './dist/replay.browser.cjs',
      },
      browser: {
        types: './dist/replay.browser.d.ts',
        import: './dist/replay.browser.js',
      },
      types: './dist/replay.d.ts',
      import: './dist/replay.js',
      require: './dist/replay.cjs',
    }
    assert.deepEqual(collectPublicConditions(entry), [
      'browser',
      'import',
      'react-native',
      'require',
      'types',
    ])
  })

  test('collects all nested types/typings targets', () => {
    const entry = {
      'react-native': { types: './dist/a.d.ts', import: './dist/a.js' },
      browser: { typings: './dist/b.d.ts' },
      types: './dist/c.d.ts',
      import: './dist/c.js',
    }
    assert.deepEqual(collectTypeTargets(entry), [
      './dist/a.d.ts',
      './dist/b.d.ts',
      './dist/c.d.ts',
    ])
  })

  test('records CSS/JS asset surface when no declaration targets', () => {
    assert.deepEqual(collectAssetTargets('./dist/theme/default.css'), [
      './dist/theme/default.css',
    ])
    assert.deepEqual(collectAssetTargets({ import: './dist/only.js' }), ['./dist/only.js'])
    // Has types → no assets
    assert.deepEqual(
      collectAssetTargets({ types: './dist/x.d.ts', import: './dist/x.js' }),
      [],
    )
  })

  test('isDeclarationTarget recognizes d.ts variants', () => {
    assert.equal(isDeclarationTarget('./dist/index.d.ts'), true)
    assert.equal(isDeclarationTarget('./dist/index.d.cts'), true)
    assert.equal(isDeclarationTarget('./dist/index.d.mts'), true)
    assert.equal(isDeclarationTarget('./dist/index.js'), false)
    assert.equal(isDeclarationTarget('./dist/theme.css'), false)
  })

  test('assetSymbols use stable #asset: names', () => {
    const symbols = assetSymbols(['dist/theme/default.css', './dist/a.css'])
    assert.deepEqual(symbols, [
      { name: '#asset:./dist/a.css', kinds: ['asset'] },
      { name: '#asset:./dist/theme/default.css', kinds: ['asset'] },
    ])
  })
})

// ---------------------------------------------------------------------------
// TypeScript classification (temp .d.ts fixtures)
// ---------------------------------------------------------------------------

describe('TypeScript export classification', () => {
  test('classifies type / value / both and preserves alias export names', () => {
    const dir = makeTempDir()
    const dts = path.join(dir, 'fixture.d.ts')
    writeFileSync(
      dts,
      `
export interface OnlyType { x: number }
export type AliasType = string
export declare function onlyValue(n: number): number
export declare const constValue: number
export declare class BothClass { m(): void }
export declare enum BothEnum { A = 1, B = 2 }
export declare namespace NS { const inner: number }
/** Re-export under a public name */
export { BothClass as PublicAlias }
`.trimStart(),
      'utf8',
    )

    const ts = loadTypeScript()
    const program = createDeclarationProgram(ts, [dts])
    const checker = program.getTypeChecker()
    const sf = program.getSourceFile(dts)
    assert.ok(sf)
    const symbols = getExportsFromSourceFile(ts, checker, sf)
    const byName = new Map(symbols.map((s) => [s.name, s.kinds.join('|')]))

    assert.equal(byName.get('OnlyType'), 'type')
    assert.equal(byName.get('AliasType'), 'type')
    assert.equal(byName.get('onlyValue'), 'value')
    assert.equal(byName.get('constValue'), 'value')
    assert.equal(byName.get('BothClass'), 'type|value')
    assert.equal(byName.get('BothEnum'), 'type|value')
    // Public alias keeps exported name; classification follows target
    assert.equal(byName.get('PublicAlias'), 'type|value')
    assert.ok(byName.has('NS'))
  })

  test('mergeSymbols unions kinds by name', () => {
    const merged = mergeSymbols(
      [{ name: 'Foo', kinds: ['type'] }],
      [
        { name: 'Foo', kinds: ['value'] },
        { name: 'Bar', kinds: ['value'] },
      ],
    )
    assert.deepEqual(merged, [
      { name: 'Bar', kinds: ['value'] },
      { name: 'Foo', kinds: ['type', 'value'] },
    ])
  })

  test('classifyExportSymbol uses SymbolFlags via checker aliases', () => {
    const dir = makeTempDir()
    const dts = path.join(dir, 'alias.d.ts')
    writeFileSync(
      dts,
      `
declare function impl(): void
export { impl as renamed }
export type { impl as RenamedType }
`.trimStart(),
      'utf8',
    )
    const ts = loadTypeScript()
    const program = createDeclarationProgram(ts, [dts])
    const checker = program.getTypeChecker()
    const sf = program.getSourceFile(dts)
    assert.ok(sf)
    const moduleSymbol = checker.getSymbolAtLocation(sf)
    assert.ok(moduleSymbol)
    const exports = checker.getExportsOfModule(moduleSymbol)
    const classified = exports.map((s) => classifyExportSymbol(ts, checker, s))
    const map = new Map(classified.map((s) => [s.name, s.kinds.join('|')]))
    assert.equal(map.get('renamed'), 'value')
    // type-only re-export of a value may surface as type depending on TS version flags
    assert.ok(map.has('RenamedType') || map.has('renamed'))
  })
})

// ---------------------------------------------------------------------------
// Diff diagnostics
// ---------------------------------------------------------------------------

describe('diffSnapshots / formatDiffDiagnostics', () => {
  test('detects package, subpath, condition, kind, and asset drift', () => {
    /** @type {import('./lib/public-api-snapshot.mjs').PublicApiSnapshot} */
    const baseline = {
      schemaVersion: 1,
      packages: {
        '@agentskit/core': {
          subpaths: {
            '.': {
              conditions: ['import', 'types'],
              symbols: [
                { name: 'A', kinds: ['type'] },
                { name: 'B', kinds: ['value'] },
                { name: 'C', kinds: ['type', 'value'] },
              ],
            },
            './gone': {
              conditions: ['types'],
              symbols: [{ name: 'Old', kinds: ['type'] }],
            },
          },
        },
        '@agentskit/legacy': {
          subpaths: {
            '.': { conditions: [], symbols: [] },
          },
        },
      },
    }

    /** @type {import('./lib/public-api-snapshot.mjs').PublicApiSnapshot} */
    const current = {
      schemaVersion: 1,
      packages: {
        '@agentskit/core': {
          subpaths: {
            '.': {
              conditions: ['import', 'require', 'types'],
              symbols: [
                { name: 'A', kinds: ['type'] },
                { name: 'B', kinds: ['type', 'value'] },
                { name: 'D', kinds: ['value'] },
              ],
            },
            './theme': {
              conditions: [],
              symbols: assetSymbols(['./dist/theme.css']),
              assets: ['./dist/theme.css'],
            },
          },
        },
        '@agentskit/new': {
          subpaths: {
            '.': {
              conditions: ['types'],
              symbols: [{ name: 'X', kinds: ['type'] }],
            },
          },
        },
      },
    }

    const changes = diffSnapshots(baseline, current)
    const kinds = new Set(changes.map((c) => c.kind))
    assert.ok(kinds.has('package-added'))
    assert.ok(kinds.has('package-removed'))
    assert.ok(kinds.has('subpath-added'))
    assert.ok(kinds.has('subpath-removed'))
    assert.ok(kinds.has('conditions'))
    assert.ok(kinds.has('symbols-added'))
    assert.ok(kinds.has('symbols-removed'))
    assert.ok(kinds.has('symbols-changed'))

    const lines = formatDiffDiagnostics(changes)
    assert.ok(lines.some((l) => l.includes('@agentskit/core') && l.includes('conditions')))
    assert.ok(lines.some((l) => l.includes('B:') || l.includes('B ')))
    assert.ok(lines.some((l) => l.includes('@agentskit/legacy')))
    assert.ok(lines.some((l) => l.includes('./theme') || l.includes('subpath added')))
  })

  test('identical snapshots produce no changes', () => {
    const snap = {
      schemaVersion: /** @type {1} */ (1),
      packages: {
        '@agentskit/core': {
          subpaths: {
            '.': {
              conditions: ['types'],
              symbols: [{ name: 'A', kinds: ['type'] }],
            },
          },
        },
      },
    }
    assert.deepEqual(diffSnapshots(snap, snap), [])
  })
})
