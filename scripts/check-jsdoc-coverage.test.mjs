import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import {
  createDeclarationProgram,
  getDocumentedExportsFromSourceFile,
  loadTypeScript,
} from './lib/public-api-snapshot.mjs'
import {
  calculateCoverage,
  findBaselineGrowth,
  serializeJsdocBaseline,
} from './lib/jsdoc-coverage.mjs'

const tempDirs = []

after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ak-jsdoc-'))
  tempDirs.push(dir)
  return dir
}

describe('public API JSDoc coverage', () => {
  test('follows direct and renamed re-exports to the original JSDoc', () => {
    const dir = tempDir()
    const entry = path.join(dir, 'index.d.ts')
    writeFileSync(entry, "export { documented as publicName, undocumented } from './impl'\n")
    writeFileSync(path.join(dir, 'impl.d.ts'), [
      '/** Public operation. */',
      'export declare function documented(): void',
      'export declare function undocumented(): void',
    ].join('\n'))

    const ts = loadTypeScript()
    const program = createDeclarationProgram(ts, [entry], {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowArbitraryExtensions: true,
    })
    const checker = program.getTypeChecker()
    const sourceFile = program.getSourceFile(entry)
    assert.ok(sourceFile)
    assert.deepEqual(getDocumentedExportsFromSourceFile(ts, checker, sourceFile), ['publicName'])
  })

  test('follows export-star re-exports and keeps undocumented names missing', () => {
    const dir = tempDir()
    const entry = path.join(dir, 'index.d.ts')
    writeFileSync(entry, "export * from './impl'\n")
    writeFileSync(path.join(dir, 'impl.d.ts'), [
      '/** Documented operation. */',
      'export declare function documented(): void',
      'export declare function undocumented(): void',
    ].join('\n'))

    const ts = loadTypeScript()
    const program = createDeclarationProgram(ts, [entry], {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    })
    const checker = program.getTypeChecker()
    const sourceFile = program.getSourceFile(entry)
    assert.ok(sourceFile)
    assert.deepEqual(getDocumentedExportsFromSourceFile(ts, checker, sourceFile), ['documented'])
  })

  test('resolves Svelte component declarations for documented re-exports', () => {
    const dir = tempDir()
    const entry = path.join(dir, 'index.d.ts')
    writeFileSync(entry, "export { default as ChatContainer } from './ChatContainer.svelte'\n")
    writeFileSync(path.join(dir, 'ChatContainer.svelte.d.ts'), [
      '/** A scrollable chat region. */',
      'declare const ChatContainer: unknown',
      'export default ChatContainer',
    ].join('\n'))

    const ts = loadTypeScript()
    const program = createDeclarationProgram(ts, [entry], {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowArbitraryExtensions: true,
    })
    const checker = program.getTypeChecker()
    const sourceFile = program.getSourceFile(entry)
    assert.ok(sourceFile)
    assert.deepEqual(getDocumentedExportsFromSourceFile(ts, checker, sourceFile), ['ChatContainer'])
  })

  test('does not let a re-export comment document an undocumented declaration', () => {
    const dir = tempDir()
    const entry = path.join(dir, 'index.d.ts')
    writeFileSync(entry, [
      '/** Public operation documented at the package entrypoint. */',
      "export { documented as publicName } from './impl.js'",
    ].join('\n'))
    writeFileSync(path.join(dir, 'impl.d.ts'), 'export declare function documented(): void\n')

    const ts = loadTypeScript()
    const program = createDeclarationProgram(ts, [entry])
    const checker = program.getTypeChecker()
    const sourceFile = program.getSourceFile(entry)
    assert.ok(sourceFile)
    assert.deepEqual(getDocumentedExportsFromSourceFile(ts, checker, sourceFile), [])
  })

  test('uses public snapshot symbols and reports per-package totals', () => {
    const snapshot = {
      schemaVersion: 1,
      packages: {
        '@agentskit/example': {
          subpaths: {
            '.': { conditions: ['types'], symbols: [
              { name: 'ready', kinds: ['value'] },
              { name: 'missing', kinds: ['type'] },
              { name: '#asset:./theme.css', kinds: ['asset'] },
            ] },
          },
        },
      },
    }
    const coverage = calculateCoverage(snapshot, { '@agentskit/example': { '.': ['ready'] } })
    assert.equal(coverage['@agentskit/example'].documented, 1)
    assert.equal(coverage['@agentskit/example'].total, 2)
    assert.deepEqual(coverage['@agentskit/example'].undocumented, ['.::missing'])
  })

  test('rejects newly undocumented symbols and keeps serialized baselines sorted', () => {
    const coverage = { '@agentskit/a': { undocumented: ['.::old', '.::new'] } }
    assert.deepEqual(findBaselineGrowth(coverage, { '@agentskit/a': ['.::old'] }), [
      '@agentskit/a: newly undocumented .::new',
    ])
    assert.equal(serializeJsdocBaseline({ '@agentskit/z': ['x'], '@agentskit/a': [] }),
      '{\n  "schemaVersion": 1,\n  "packages": {\n    "@agentskit/a": [],\n    "@agentskit/z": [\n      "x"\n    ]\n  }\n}\n')
  })
})
