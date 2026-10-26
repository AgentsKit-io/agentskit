/**
 * Unit tests for packed-consumer pure helpers.
 * Run: node --test scripts/packed-consumers.test.mjs
 */

import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../packages/cross-platform/dist/index.js'
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
  selectPackedConsumerPackages,
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

  test('svelte is structural in Node; optional peer eval subpaths remain import-checked', () => {
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

    const evalException = findException('@agentskit/eval', './braintrust')
    assert.equal(evalException?.optionalPeer, true)
    const evalModes = deriveModesForExport(
      { types: './dist/braintrust.d.ts', import: './dist/braintrust.js', require: './dist/braintrust.cjs' },
      { packageName: '@agentskit/eval', subpath: './braintrust' },
    )
    assert.ok(evalModes.some((m) => m.mode === 'esm'))
    assert.ok(evalModes.some((m) => m.mode === 'cjs'))
    assert.ok(evalModes.some((m) => m.mode === 'types'))
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

describe('packed-consumer build scope', () => {
  const packages = ['core', 'rag', 'cli', 'angular'].map((name) => ({
    packageName: `@agentskit/${name}`,
  }))
  const buildTask = (name) => ({ task: 'build', package: `@agentskit/${name}` })

  test('checks every public package when no scope is supplied', () => {
    assert.deepEqual(selectPackedConsumerPackages(packages), packages)
  })

  test('uses build tasks including dependencies, not only directly affected packages', () => {
    assert.deepEqual(selectPackedConsumerPackages(packages, {
      packages: ['@agentskit/rag', '@agentskit/cli'],
      tasks: [buildTask('rag'), buildTask('cli'), buildTask('core'), buildTask('rag'), buildTask('docs-next')],
    }), packages.slice(0, 3))
  })

  test('allows an empty public scope for docs-only builds', () => {
    assert.deepEqual(selectPackedConsumerPackages(packages, { tasks: [] }), [])
    assert.deepEqual(selectPackedConsumerPackages(packages, { tasks: [buildTask('docs-next')] }), [])
  })

  test('rejects malformed plans instead of silently skipping validation', () => {
    for (const plan of [null, {}, { tasks: null }, { tasks: [null] },
      { tasks: [{ task: 'test', package: '@agentskit/rag' }] },
      { tasks: [{ task: 'build' }] }, { tasks: [{ task: 'build', package: '' }] }]) {
      assert.throws(() => selectPackedConsumerPackages(packages, plan), /scope/)
    }
  })
})

// ---------------------------------------------------------------------------
// Angular packed-tarball type resolution (bundler + node16)
// ---------------------------------------------------------------------------

describe('@agentskit/angular packed type declarations', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const angularRoot = path.join(repoRoot, 'packages', 'angular')
  const angularNodeModules = path.join(angularRoot, 'node_modules')
  const tsc = path.join(angularNodeModules, 'typescript', 'bin', 'tsc')
  let workDir
  let packedManifest

  const run = async (command, args, cwd) => {
    const result = await runCommand(command, args, { cwd })
    return { ok: result.code === 0, output: `${result.stdout}${result.stderr}` }
  }

  const runOrThrow = async (command, args, cwd) => {
    const result = await run(command, args, cwd)
    assert.ok(result.ok, `${command} ${args.join(' ')} failed:\n${result.output}`)
    return result
  }

  const runTsc = (project) => run(process.execPath, [tsc, '-p', project, '--noEmit'], repoRoot)

  /** Lay out a consumer project whose node_modules holds the extracted tarball. */
  const createConsumer = (name, resolution, manifest) => {
    const root = path.join(workDir, name)
    const pkgDir = path.join(root, 'node_modules', '@agentskit', 'angular')
    mkdirSync(path.dirname(pkgDir), { recursive: true })
    cpSync(path.join(workDir, 'extract', 'package'), pkgDir, { recursive: true })
    writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(manifest, null, 2))
    for (const dep of ['@agentskit/core', '@angular/core', '@angular/common', 'rxjs', 'tslib']) {
      const dest = path.join(root, 'node_modules', dep)
      mkdirSync(path.dirname(dest), { recursive: true })
      symlinkSync(path.join(angularNodeModules, dep), dest, 'dir')
    }
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }))
    writeFileSync(
      path.join(root, 'index.ts'),
      [
        "import { AgentskitChat, ChatContainerComponent, MessageComponent } from '@agentskit/angular'",
        'export const chat: typeof AgentskitChat = AgentskitChat',
        'export const components = [ChatContainerComponent, MessageComponent]',
        '',
      ].join('\n'),
    )
    writeFileSync(
      path.join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: resolution === 'bundler' ? 'esnext' : 'node16',
          moduleResolution: resolution,
          target: 'es2022',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          types: [],
        },
        files: ['index.ts'],
      }),
    )
    return root
  }

  before(async () => {
    if (!existsSync(path.join(angularRoot, 'dist', 'types', 'agentskit-angular.d.ts'))) {
      await runOrThrow('pnpm', ['exec', 'turbo', 'run', 'build', '--filter=@agentskit/angular', '--concurrency=2'], repoRoot)
    }
    workDir = mkdtempSync(path.join(tmpdir(), 'agentskit-angular-consumer-'))
    const packDir = path.join(workDir, 'pack')
    mkdirSync(packDir)
    await runOrThrow('pnpm', ['pack', '--pack-destination', packDir], angularRoot)
    const tarball = readdirSync(packDir).find((file) => file.endsWith('.tgz'))
    mkdirSync(path.join(workDir, 'extract'))
    await runOrThrow('tar', ['-xzf', path.join(packDir, tarball), '-C', path.join(workDir, 'extract')], repoRoot)
    packedManifest = JSON.parse(readFileSync(path.join(workDir, 'extract', 'package', 'package.json'), 'utf8'))
  })

  after(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true })
  })

  test('packed manifest lists types first and the declaration file ships', () => {
    assert.equal(Object.keys(packedManifest.exports['.'])[0], 'types')
    const declaration = path.join(workDir, 'extract', 'package', packedManifest.exports['.'].types)
    assert.ok(existsSync(declaration), `missing ${packedManifest.exports['.'].types}`)
    assert.equal(packedManifest.types, packedManifest.exports['.'].types)
  })

  for (const resolution of ['bundler', 'node16']) {
    test(`type-checks the public API under moduleResolution ${resolution}`, async () => {
      const result = await runTsc(createConsumer(`ok-${resolution}`, resolution, packedManifest))
      assert.ok(result.ok, result.output)
    })

    test(`guard: fails with unresolved types under ${resolution} when exports omit types`, async () => {
      const { types: _types, ...withoutTypes } = packedManifest.exports['.']
      const stripped = { ...packedManifest, exports: { '.': withoutTypes } }
      const result = await runTsc(createConsumer(`stripped-${resolution}`, resolution, stripped))
      assert.equal(result.ok, false, 'consumer unexpectedly type-checked without a types condition')
      assert.match(result.output, /TS7016|TS2307/)
    })
  }
})
