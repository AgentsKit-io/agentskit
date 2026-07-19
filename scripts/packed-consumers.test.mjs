/**
 * Unit tests for packed-consumer pure helpers.
 * Run: node --test scripts/packed-consumers.test.mjs
 */

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  buildValidationPlan,
  collectExportTargets,
  collectPublicationTargets,
  deriveModesForExport,
  findException,
  findMissingTargets,
  findWorkspaceProtocolInManifest,
  findWorkspaceProtocolRefs,
  formatDiagnostic,
  hasNodeShebang,
  isAllowedPackedPath,
  isPathInsidePackage,
  isUnsafeArchiveEntry,
  shouldTypecheckEntry,
  stripPackagePrefix,
  validateTarballEntries,
} from './lib/packed-consumers.mjs'

// ---------------------------------------------------------------------------
// Traversal / archive safety
// ---------------------------------------------------------------------------

describe('isUnsafeArchiveEntry', () => {
  test('accepts normal package-relative entries', () => {
    assert.equal(isUnsafeArchiveEntry('package/dist/index.js'), false)
    assert.equal(isUnsafeArchiveEntry('package/package.json'), false)
    assert.equal(isUnsafeArchiveEntry('package/dist/nested/file.cjs'), false)
  })

  test('rejects absolute paths', () => {
    assert.equal(isUnsafeArchiveEntry('/etc/passwd'), true)
    assert.equal(isUnsafeArchiveEntry('\\Windows\\System32'), true)
    assert.equal(isUnsafeArchiveEntry('C:\\evil.txt'), true)
  })

  test('rejects .. traversal segments', () => {
    assert.equal(isUnsafeArchiveEntry('package/../outside'), true)
    assert.equal(isUnsafeArchiveEntry('package/dist/../../etc/passwd'), true)
    assert.equal(isUnsafeArchiveEntry('../package.json'), true)
  })

  test('rejects null bytes and empty', () => {
    assert.equal(isUnsafeArchiveEntry(''), true)
    assert.equal(isUnsafeArchiveEntry('package/\0x'), true)
  })
})

describe('isAllowedPackedPath / stripPackagePrefix', () => {
  test('strips package/ prefix', () => {
    assert.equal(stripPackagePrefix('package/dist/index.js'), 'dist/index.js')
    assert.equal(stripPackagePrefix('package/package.json'), 'package.json')
  })

  test('allowlist permits metadata and dist only', () => {
    assert.equal(isAllowedPackedPath('package.json'), true)
    assert.equal(isAllowedPackedPath('README.md'), true)
    assert.equal(isAllowedPackedPath('LICENSE'), true)
    assert.equal(isAllowedPackedPath('CHANGELOG.md'), true)
    assert.equal(isAllowedPackedPath('dist/index.js'), true)
    assert.equal(isAllowedPackedPath('dist/theme/default.css'), true)
    assert.equal(isAllowedPackedPath('src/index.ts'), false)
    assert.equal(isAllowedPackedPath('tests/foo.test.ts'), false)
    assert.equal(isAllowedPackedPath('tsconfig.json'), false)
    assert.equal(isAllowedPackedPath('.env'), false)
    assert.equal(isAllowedPackedPath('vitest.config.ts'), false)
  })

  test('validateTarballEntries reports non-dist and unsafe entries', () => {
    const errors = validateTarballEntries([
      'package/package.json',
      'package/dist/index.js',
      'package/src/index.ts',
      'package/../evil',
    ])
    assert.ok(errors.some((e) => e.includes('src/index.ts')))
    assert.ok(errors.some((e) => e.includes('unsafe') || e.includes('..')))
  })
})

describe('isPathInsidePackage', () => {
  test('accepts in-package relatives and rejects escape', () => {
    assert.equal(isPathInsidePackage('/tmp/pkg', '/tmp/pkg/dist/index.js'), true)
    assert.equal(isPathInsidePackage('/tmp/pkg', '/tmp/pkg/../outside'), false)
  })
})

// ---------------------------------------------------------------------------
// Recursive export-target collection
// ---------------------------------------------------------------------------

describe('collectExportTargets / collectPublicationTargets', () => {
  test('collects nested conditional export targets recursively', () => {
    const exports = {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
      './replay': {
        'react-native': {
          types: './dist/replay.browser.d.ts',
          import: './dist/replay.browser.js',
        },
        browser: './dist/replay.browser.js',
        types: './dist/replay.d.ts',
        import: './dist/replay.js',
        require: './dist/replay.cjs',
      },
      './theme': './dist/theme/default.css',
    }

    const targets = collectExportTargets(exports)
    assert.ok(targets.includes('./dist/index.js'))
    assert.ok(targets.includes('./dist/replay.browser.js'))
    assert.ok(targets.includes('./dist/replay.cjs'))
    assert.ok(targets.includes('./dist/theme/default.css'))
    assert.equal(new Set(targets).size, targets.length)
  })

  test('collectPublicationTargets includes main/module/types/svelte/bin', () => {
    const items = collectPublicationTargets({
      main: './dist/index.cjs',
      module: './dist/index.js',
      types: './dist/index.d.ts',
      svelte: './dist/index.js',
      bin: { tool: './dist/bin.js' },
      exports: {
        '.': {
          import: './dist/index.js',
          require: './dist/index.cjs',
        },
      },
    })
    const targets = items.map((i) => i.target)
    assert.ok(targets.includes('./dist/index.cjs'))
    assert.ok(targets.includes('./dist/bin.js'))
    assert.ok(targets.includes('./dist/index.d.ts'))
    assert.ok(items.some((i) => i.field === 'bin.tool'))
  })
})

// ---------------------------------------------------------------------------
// Workspace protocol detection
// ---------------------------------------------------------------------------

describe('workspace protocol detection', () => {
  test('finds workspace: recursively in dependency fields', () => {
    const hits = findWorkspaceProtocolInManifest({
      dependencies: {
        '@agentskit/core': 'workspace:*',
        lodash: '^4.0.0',
      },
      peerDependencies: {
        react: 'workspace:^',
      },
      optionalDependencies: {
        nested: {
          weird: 'workspace:../other',
        },
      },
    })
    assert.ok(hits.some((h) => h.path === 'dependencies.@agentskit/core'))
    assert.ok(hits.some((h) => h.path === 'peerDependencies.react'))
    assert.ok(hits.some((h) => h.value.includes('workspace:')))
  })

  test('returns empty when no workspace protocol present', () => {
    const hits = findWorkspaceProtocolRefs({
      dependencies: { '@agentskit/core': '1.2.3' },
    })
    assert.deepEqual(hits, [])
  })
})

// ---------------------------------------------------------------------------
// Missing target detection
// ---------------------------------------------------------------------------

describe('findMissingTargets', () => {
  test('reports missing and non-file targets', () => {
    const existing = new Set(['/pkg/dist/index.js'])
    const files = new Set(['/pkg/dist/index.js'])
    const missing = findMissingTargets(
      [
        { field: 'exports', subpath: '.', target: './dist/index.js' },
        { field: 'exports', subpath: './missing', target: './dist/missing.js' },
        { field: 'exports', subpath: './dir', target: './dist/dir' },
      ],
      {
        packageRoot: '/pkg',
        resolvePath: (root, rel) => `${root}/${rel.replace(/^\.\//, '')}`,
        exists: (abs) => existing.has(abs) || abs.endsWith('/dist/dir'),
        isFile: (abs) => files.has(abs),
      },
    )
    assert.ok(missing.some((m) => m.target === './dist/missing.js' && m.reason === 'missing'))
    assert.ok(missing.some((m) => m.target === './dist/dir' && m.reason === 'not-a-file'))
    assert.ok(!missing.some((m) => m.target === './dist/index.js'))
  })
})

// ---------------------------------------------------------------------------
// Exception handling / mode derivation
// ---------------------------------------------------------------------------

describe('exception handling and mode derivation', () => {
  test('react theme is css-file only via exception table', () => {
    const exception = findException('@agentskit/react', './theme')
    assert.ok(exception)
    assert.equal(exception.id, 'react-theme-css')
    const modes = deriveModesForExport('./dist/theme/default.css', {
      packageName: '@agentskit/react',
      subpath: './theme',
    })
    assert.deepEqual(
      modes.map((m) => m.mode),
      ['css-file'],
    )
  })

  test('angular is angular-apf with no esm/cjs runtime modes', () => {
    const modes = deriveModesForExport(
      {
        types: './dist/types/agentskit-angular.d.ts',
        import: './dist/fesm2022/agentskit-angular.mjs',
        default: './dist/fesm2022/agentskit-angular.mjs',
      },
      { packageName: '@agentskit/angular', subpath: '.' },
    )
    assert.ok(modes.every((m) => m.mode === 'angular-apf' || m.mode === 'types'))
    assert.ok(!modes.some((m) => m.mode === 'esm' || m.mode === 'cjs'))
  })

  test('svelte is structural in Node (no CJS); optional peer subpaths are structural', () => {
    const svelteModes = deriveModesForExport(
      { types: './dist/index.d.ts', import: './dist/index.js', svelte: './dist/index.js' },
      { packageName: '@agentskit/svelte', subpath: '.' },
    )
    assert.ok(svelteModes.every((m) => m.mode === 'structural' || m.mode === 'types'))
    assert.ok(!svelteModes.some((m) => m.mode === 'cjs' || m.mode === 'esm'))
    assert.equal(findException('@agentskit/svelte', '.')?.skipEsm, true)
    assert.equal(findException('@agentskit/svelte', '.')?.skipCjs, true)

    const langfuse = findException('@agentskit/observability', './langfuse')
    assert.equal(langfuse?.optionalPeer, true)
    const modes = deriveModesForExport(
      { types: './dist/langfuse.d.ts', import: './dist/langfuse.js', require: './dist/langfuse.cjs' },
      { packageName: '@agentskit/observability', subpath: './langfuse' },
    )
    assert.ok(modes.every((m) => m.mode === 'structural' || m.mode === 'types'))
  })

  test('Solid is structural at runtime but remains typechecked', () => {
    const plan = buildValidationPlan('@agentskit/solid', {
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
          require: './dist/index.cjs',
        },
      },
    })

    assert.deepEqual(plan[0].modes.map((mode) => mode.mode), ['structural', 'types'])
    assert.equal(shouldTypecheckEntry(plan[0]), true)
  })

  test('browser/react-native conditions become structural when derived', () => {
    const modes = deriveModesForExport(
      {
        'react-native': './dist/index.browser.js',
        browser: './dist/index.browser.js',
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
      { packageName: '@agentskit/rag', subpath: '.' },
    )
    assert.ok(modes.some((m) => m.mode === 'structural' && m.condition === 'browser'))
    assert.ok(modes.some((m) => m.mode === 'structural' && m.condition === 'react-native'))
    assert.ok(modes.some((m) => m.mode === 'esm'))
    assert.ok(modes.some((m) => m.mode === 'cjs'))
  })

  test('buildValidationPlan + shouldTypecheckEntry honor exemptions', () => {
    const plan = buildValidationPlan('@agentskit/react', {
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
          require: './dist/index.cjs',
        },
        './theme': './dist/theme/default.css',
      },
    })
    const root = plan.find((p) => p.subpath === '.')
    const theme = plan.find((p) => p.subpath === './theme')
    assert.ok(root)
    assert.ok(theme)
    assert.equal(shouldTypecheckEntry(root), true)
    assert.equal(shouldTypecheckEntry(theme), false)
    assert.equal(shouldTypecheckEntry({
      packageName: '@agentskit/angular',
      subpath: '.',
      modes: [{ mode: 'angular-apf' }],
    }), false)
  })
})

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

describe('shebang and diagnostics', () => {
  test('hasNodeShebang detects Node shebangs only', () => {
    assert.equal(hasNodeShebang('#!/usr/bin/env node\nconsole.log(1)\n'), true)
    assert.equal(hasNodeShebang('#!/usr/bin/node\n'), true)
    assert.equal(hasNodeShebang('#!/usr/bin/env bash\n'), false)
    assert.equal(hasNodeShebang('console.log(1)\n'), false)
  })

  test('formatDiagnostic is deterministic with package/subpath/mode', () => {
    assert.equal(
      formatDiagnostic({
        packageName: '@agentskit/core',
        subpath: './security',
        mode: 'esm',
        message: 'import failed',
      }),
      '@agentskit/core · ./security · esm: import failed',
    )
  })
})
