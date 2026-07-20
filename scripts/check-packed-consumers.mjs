#!/usr/bin/env node
/**
 * Packed-consumer publication contract.
 *
 * Discovers public packages under packages/*, packs each with `pnpm pack`
 * (local artifacts only), validates tarball safety + dist-centric contents,
 * checks the packed manifest, batch-imports safe ESM/CJS surfaces without
 * installing, and typechecks consumer fixtures with bundler + NodeNext.
 *
 * Prerequisite: package dist outputs must already exist
 *   (`pnpm --filter "./packages/*" build`).
 *
 * Never installs dependencies, never hits the registry, never executes bins.
 */

import { execFile as execFileCallback } from 'node:child_process'
import {
  access,
  constants,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  buildValidationPlan,
  collectPublicationTargets,
  findMissingTargets,
  findWorkspaceProtocolInManifest,
  formatDiagnostic,
  hasNodeShebang,
  isPathInsidePackage,
  isUnsafeArchiveEntry,
  shouldTypecheckEntry,
  stripPackagePrefix,
  validateTarballEntries,
} from './lib/packed-consumers.mjs'
import { findException } from './lib/packed-consumers-matrix.mjs'

const execFile = promisify(execFileCallback)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages')

const MAX_STDOUT = 512 * 1024
const PACK_TIMEOUT_MS = 120_000
const IMPORT_TIMEOUT_MS = 120_000
const TSC_TIMEOUT_MS = 180_000

/** @type {{ packageName: string, subpath?: string | null, mode?: string, message: string }[]} */
const diagnostics = []

function pushDiag(partial) {
  diagnostics.push(partial)
}

function truncate(text, max) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n…[truncated ${text.length - max} bytes]`
}

/**
 * @param {string} file
 * @param {string[]} args
 * @param {{ cwd?: string, timeout?: number, env?: NodeJS.ProcessEnv }} [options]
 */
async function runCaptured(file, args, options = {}) {
  try {
    const result = await execFile(file, args, {
      cwd: options.cwd ?? REPO_ROOT,
      env: options.env ?? process.env,
      timeout: options.timeout ?? PACK_TIMEOUT_MS,
      maxBuffer: MAX_STDOUT,
      encoding: 'utf8',
      shell: false,
    })
    return {
      ok: true,
      stdout: truncate(result.stdout ?? '', MAX_STDOUT),
      stderr: truncate(result.stderr ?? '', MAX_STDOUT / 2),
      code: 0,
    }
  } catch (error) {
    const err = /** @type {NodeJS.ErrnoException & { stdout?: string, stderr?: string, code?: number | string }} */ (
      error
    )
    return {
      ok: false,
      stdout: truncate(String(err.stdout ?? ''), MAX_STDOUT),
      stderr: truncate(String(err.stderr ?? err.message ?? error), MAX_STDOUT / 2),
      code: typeof err.code === 'number' ? err.code : 1,
    }
  }
}

/**
 * @returns {Promise<{ dir: string, packageName: string, manifest: Record<string, unknown>, packageRoot: string }[]>}
 */
async function discoverPublicPackages() {
  const entries = await readdir(PACKAGES_ROOT, { withFileTypes: true })
  /** @type {{ dir: string, packageName: string, manifest: Record<string, unknown>, packageRoot: string }[]} */
  const packages = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const packageRoot = path.join(PACKAGES_ROOT, entry.name)
    const manifestPath = path.join(packageRoot, 'package.json')
    let raw
    try {
      raw = await readFile(manifestPath, 'utf8')
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue
      throw error
    }
    const manifest = JSON.parse(raw)
    if (manifest.private === true) continue
    if (typeof manifest.name !== 'string' || !manifest.name) {
      pushDiag({
        packageName: entry.name,
        mode: 'discovery',
        message: 'public package is missing a name',
      })
      continue
    }
    packages.push({
      dir: entry.name,
      packageName: manifest.name,
      manifest,
      packageRoot,
    })
  }

  packages.sort((a, b) => a.packageName.localeCompare(b.packageName))
  return packages
}

/**
 * @param {{ packageName: string, packageRoot: string, manifest: Record<string, unknown> }[]} packages
 */
async function assertBuildPrerequisite(packages) {
  /** @type {string[]} */
  const missing = []
  for (const pkg of packages) {
    const targets = collectPublicationTargets(pkg.manifest)
    const sample = targets.find((t) => String(t.target).includes('dist/')) ?? targets[0]
    if (!sample) {
      missing.push(`${pkg.packageName} (no publication targets in source manifest)`)
      continue
    }
    try {
      await access(path.resolve(pkg.packageRoot, sample.target), constants.F_OK)
    } catch {
      missing.push(`${pkg.packageName} → ${sample.target}`)
    }
  }
  if (missing.length > 0) {
    console.error('packed-consumer check: missing build prerequisite (package dist outputs).')
    console.error('Run: pnpm --filter "./packages/*" build')
    console.error('Missing:')
    for (const line of missing) console.error(`  - ${line}`)
    process.exit(1)
  }
}

/**
 * @param {string} tarballPath
 */
async function listTarballEntries(tarballPath) {
  const result = await runCaptured('tar', ['-tzf', tarballPath], { timeout: 60_000 })
  if (!result.ok) {
    throw new Error(`tar -tzf failed: ${result.stderr || result.stdout}`)
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * @param {string} tarballPath
 * @param {string} destDir
 */
async function safeExtractTarball(tarballPath, destDir) {
  const entries = await listTarballEntries(tarballPath)
  /** @type {string[]} */
  const errors = []

  for (const entry of entries) {
    if (isUnsafeArchiveEntry(entry)) {
      errors.push(`unsafe archive entry: ${JSON.stringify(entry)}`)
    }
  }
  for (const message of validateTarballEntries(entries)) {
    errors.push(message)
  }
  if (errors.length > 0) {
    return { entries, errors, extractRoot: null }
  }

  await mkdir(destDir, { recursive: true })
  const extract = await runCaptured('tar', ['-xzf', tarballPath, '-C', destDir], { timeout: 60_000 })
  if (!extract.ok) {
    return {
      entries,
      errors: [`tar extract failed: ${extract.stderr || extract.stdout}`],
      extractRoot: null,
    }
  }

  const packageDir = path.join(destDir, 'package')
  for (const entry of entries) {
    const relative = stripPackagePrefix(entry.replace(/\/$/, ''))
    if (!relative) continue
    const abs = path.resolve(packageDir, relative)
    const relToDest = path.relative(destDir, abs)
    if (relToDest.startsWith('..') || path.isAbsolute(relToDest)) {
      return {
        entries,
        errors: [`extracted path escaped destination: ${JSON.stringify(entry)}`],
        extractRoot: null,
      }
    }
    const stat = await lstat(abs)
    if (stat.isSymbolicLink()) {
      return {
        entries,
        errors: [`tarball contains a symbolic link: ${JSON.stringify(entry)}`],
        extractRoot: null,
      }
    }
  }

  return { entries, errors: [], extractRoot: packageDir }
}

/**
 * @param {string} packageRoot
 * @param {string} tarballDir
 */
async function packPackage(packageRoot, tarballDir) {
  await mkdir(tarballDir, { recursive: true })
  const result = await runCaptured('pnpm', ['pack', '--pack-destination', tarballDir], {
    cwd: packageRoot,
    timeout: PACK_TIMEOUT_MS,
    env: {
      ...process.env,
      npm_config_ignore_scripts: 'true',
      PNPM_IGNORE_SCRIPTS: 'true',
    },
  })
  if (!result.ok) {
    return {
      ok: false,
      tarballPath: null,
      detail: result.stderr || result.stdout || `pnpm pack exited ${result.code}`,
    }
  }

  const files = (await readdir(tarballDir)).filter((name) => name.endsWith('.tgz')).sort()
  if (files.length === 0) {
    return { ok: false, tarballPath: null, detail: 'pnpm pack produced no .tgz' }
  }
  return {
    ok: true,
    tarballPath: path.join(tarballDir, files[files.length - 1]),
    detail: '',
  }
}

/**
 * @param {string} destNodeModules
 * @param {string} sourceNodeModules
 */
async function linkExternalDeps(destNodeModules, sourceNodeModules) {
  let entries
  try {
    entries = await readdir(sourceNodeModules, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name === '.bin' || entry.name === '.package-lock.json') continue
    if (entry.name === '@agentskit') continue

    const source = path.join(sourceNodeModules, entry.name)
    const dest = path.join(destNodeModules, entry.name)

    if (entry.name.startsWith('@')) {
      let scopedEntries
      try {
        scopedEntries = await readdir(source, { withFileTypes: true })
      } catch {
        continue
      }
      await mkdir(dest, { recursive: true })
      for (const child of scopedEntries) {
        const childDest = path.join(dest, child.name)
        try {
          await access(childDest, constants.F_OK)
          continue
        } catch {
          // link missing package
        }
        try {
          await symlink(await realpath(path.join(source, child.name)), childDest, 'dir')
        } catch {
          try {
            await symlink(path.join(source, child.name), childDest, 'dir')
          } catch {
            // ignore unreadable entries
          }
        }
      }
      continue
    }

    try {
      await access(dest, constants.F_OK)
      continue
    } catch {
      // link missing package
    }
    try {
      await symlink(await realpath(source), dest, 'dir')
    } catch {
      try {
        await symlink(source, dest, 'dir')
      } catch {
        // ignore
      }
    }
  }
}

/**
 * @param {string} consumerRoot
 * @param {Map<string, string>} packageNameToExtractRoot
 */
async function linkConsumerNodeModules(consumerRoot, packageNameToExtractRoot) {
  const nm = path.join(consumerRoot, 'node_modules')
  const scoped = path.join(nm, '@agentskit')
  await mkdir(scoped, { recursive: true })

  for (const [packageName, extractRoot] of packageNameToExtractRoot) {
    const short = packageName.replace(/^@agentskit\//, '')
    await symlink(extractRoot, path.join(scoped, short), 'dir')
    await symlink(nm, path.join(extractRoot, 'node_modules'), 'dir')
  }

  await linkExternalDeps(nm, path.join(REPO_ROOT, 'node_modules'))

  const packageDirs = await readdir(PACKAGES_ROOT, { withFileTypes: true })
  for (const entry of packageDirs) {
    if (!entry.isDirectory()) continue
    const localNm = path.join(PACKAGES_ROOT, entry.name, 'node_modules')
    try {
      await access(localNm, constants.F_OK)
    } catch {
      continue
    }
    await linkExternalDeps(nm, localNm)
  }
}

/**
 * @param {string} extractRoot
 * @param {string} packageName
 * @param {Record<string, unknown>} packedManifest
 */
async function validateExtractedPackage(extractRoot, packageName, packedManifest) {
  const workspaceHits = findWorkspaceProtocolInManifest(packedManifest)
  for (const hit of workspaceHits) {
    pushDiag({
      packageName,
      mode: 'workspace-protocol',
      message: `${hit.path} retains ${JSON.stringify(hit.value)}`,
    })
  }

  const targets = collectPublicationTargets(packedManifest)
  const existsCache = new Map()
  const fileCache = new Map()

  for (const item of targets) {
    const abs = path.resolve(extractRoot, item.target)
    const rel = path.relative(extractRoot, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel) || isUnsafeArchiveEntry(rel.replace(/\\/g, '/'))) {
      pushDiag({
        packageName,
        subpath: item.subpath,
        mode: 'path-escape',
        message: `target ${JSON.stringify(item.target)} escapes package root`,
      })
      existsCache.set(abs, false)
      continue
    }
    if (!isPathInsidePackage(extractRoot, abs, path)) {
      pushDiag({
        packageName,
        subpath: item.subpath,
        mode: 'path-escape',
        message: `target ${JSON.stringify(item.target)} is outside package`,
      })
      existsCache.set(abs, false)
      continue
    }
    try {
      const stat = await lstat(abs)
      existsCache.set(abs, true)
      fileCache.set(abs, stat.isFile())
    } catch {
      existsCache.set(abs, false)
      fileCache.set(abs, false)
    }
  }

  const missing = findMissingTargets(targets, {
    packageRoot: extractRoot,
    resolvePath: (root, rel) => path.resolve(root, rel),
    exists: (absPath) => existsCache.get(absPath) === true,
    isFile: (absPath) => fileCache.get(absPath) === true,
  })
  for (const item of missing) {
    pushDiag({
      packageName,
      subpath: item.subpath,
      mode: 'missing-target',
      message: `${item.field} target ${JSON.stringify(item.target)} is ${item.reason}`,
    })
  }

  /** @type {Record<string, string>} */
  const bins = {}
  if (typeof packedManifest.bin === 'string') bins['(bin)'] = packedManifest.bin
  else if (packedManifest.bin && typeof packedManifest.bin === 'object') {
    Object.assign(bins, /** @type {Record<string, string>} */ (packedManifest.bin))
  }
  for (const [binName, relTarget] of Object.entries(bins)) {
    if (typeof relTarget !== 'string') continue
    const abs = path.resolve(extractRoot, relTarget)
    const rel = path.relative(extractRoot, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      pushDiag({
        packageName,
        mode: 'bin',
        message: `bin ${binName} target escapes package: ${JSON.stringify(relTarget)}`,
      })
      continue
    }
    try {
      const content = await readFile(abs, 'utf8')
      if (!hasNodeShebang(content)) {
        pushDiag({
          packageName,
          mode: 'bin-shebang',
          message: `bin ${binName} (${relTarget}) is missing a Node shebang`,
        })
      }
    } catch {
      // missing-target already reported
    }
  }

  if (packageName === '@agentskit/angular') {
    for (const field of ['types', 'module', 'main']) {
      const value = packedManifest[field]
      if (typeof value !== 'string') continue
      try {
        await access(path.resolve(extractRoot, value), constants.F_OK)
      } catch {
        pushDiag({
          packageName,
          mode: 'angular-apf',
          message: `${field} entry missing: ${value}`,
        })
      }
    }
  }

  return targets.length
}

/**
 * @param {string} consumerRoot
 * @param {{ packageName: string, subpath: string, specifier: string, modes: { mode: string }[] }[]} planEntries
 */
async function runBatchRuntimeImports(consumerRoot, planEntries) {
  /** @type {string[]} */
  const esmSpecifiers = []
  /** @type {string[]} */
  const cjsSpecifiers = []
  /** @type {Map<string, { packageName: string, subpath: string }>} */
  const esmMeta = new Map()
  /** @type {Map<string, { packageName: string, subpath: string }>} */
  const cjsMeta = new Map()

  for (const entry of planEntries) {
    const exception = findException(entry.packageName, entry.subpath)
    const runtimeBlocked = entry.modes.every((m) =>
      ['css-file', 'structural', 'angular-apf', 'types'].includes(m.mode),
    )
    if (runtimeBlocked) continue

    if (entry.modes.some((m) => m.mode === 'esm') && !exception?.skipEsm) {
      esmSpecifiers.push(entry.specifier)
      esmMeta.set(entry.specifier, { packageName: entry.packageName, subpath: entry.subpath })
    }
    if (entry.modes.some((m) => m.mode === 'cjs') && !exception?.skipCjs) {
      cjsSpecifiers.push(entry.specifier)
      cjsMeta.set(entry.specifier, { packageName: entry.packageName, subpath: entry.subpath })
    }
  }

  const uniqueEsm = [...new Set(esmSpecifiers)].sort()
  const uniqueCjs = [...new Set(cjsSpecifiers)].sort()

  await writeFile(
    path.join(consumerRoot, 'batch-esm.mjs'),
    [
      'const specifiers = ' + JSON.stringify(uniqueEsm),
      'const results = {}',
      'for (const specifier of specifiers) {',
      '  try { await import(specifier); results[specifier] = { ok: true } }',
      '  catch (error) { results[specifier] = { ok: false, message: error && error.message ? String(error.message) : String(error) } }',
      '}',
      'process.stdout.write(JSON.stringify(results))',
      '',
    ].join('\n'),
    'utf8',
  )
  await writeFile(
    path.join(consumerRoot, 'batch-cjs.cjs'),
    [
      "'use strict'",
      'const specifiers = ' + JSON.stringify(uniqueCjs),
      'const results = {}',
      'for (const specifier of specifiers) {',
      '  try { require(specifier); results[specifier] = { ok: true } }',
      '  catch (error) { results[specifier] = { ok: false, message: error && error.message ? String(error.message) : String(error) } }',
      '}',
      'process.stdout.write(JSON.stringify(results))',
      '',
    ].join('\n'),
    'utf8',
  )

  let esmOk = 0
  let cjsOk = 0

  if (uniqueEsm.length > 0) {
    const result = await runCaptured(process.execPath, [path.join(consumerRoot, 'batch-esm.mjs')], {
      cwd: consumerRoot,
      timeout: IMPORT_TIMEOUT_MS,
    })
    let parsed = {}
    try {
      parsed = JSON.parse(result.stdout || '{}')
    } catch {
      pushDiag({
        packageName: '(runtime)',
        mode: 'esm-batch',
        message: `non-JSON batch output: ${truncate(result.stderr || result.stdout || `exit ${result.code}`, 800)}`,
      })
    }
    for (const specifier of uniqueEsm) {
      const outcome = parsed[specifier]
      const info = esmMeta.get(specifier)
      if (outcome?.ok) esmOk += 1
      else {
        pushDiag({
          packageName: info?.packageName ?? specifier,
          subpath: info?.subpath,
          mode: 'esm',
          message: outcome?.message || result.stderr || 'import failed',
        })
      }
    }
  }

  if (uniqueCjs.length > 0) {
    const result = await runCaptured(process.execPath, [path.join(consumerRoot, 'batch-cjs.cjs')], {
      cwd: consumerRoot,
      timeout: IMPORT_TIMEOUT_MS,
    })
    let parsed = {}
    try {
      parsed = JSON.parse(result.stdout || '{}')
    } catch {
      pushDiag({
        packageName: '(runtime)',
        mode: 'cjs-batch',
        message: `non-JSON batch output: ${truncate(result.stderr || result.stdout || `exit ${result.code}`, 800)}`,
      })
    }
    for (const specifier of uniqueCjs) {
      const outcome = parsed[specifier]
      const info = cjsMeta.get(specifier)
      if (outcome?.ok) cjsOk += 1
      else {
        pushDiag({
          packageName: info?.packageName ?? specifier,
          subpath: info?.subpath,
          mode: 'cjs',
          message: outcome?.message || result.stderr || 'require failed',
        })
      }
    }
  }

  return { esmOk, cjsOk, esmTotal: uniqueEsm.length, cjsTotal: uniqueCjs.length }
}

/**
 * @param {string} consumerRoot
 * @param {{ packageName: string, subpath: string, specifier: string, modes: { mode: string }[] }[]} planEntries
 */
async function runTypecheckFixtures(consumerRoot, planEntries) {
  const typeEntries = planEntries.filter(shouldTypecheckEntry)
  const specifiers = [...new Set(typeEntries.map((e) => e.specifier))].sort()

  const importLines = specifiers.map(
    (specifier, index) => `import * as m${index} from ${JSON.stringify(specifier)}`,
  )
  const useLines = specifiers.map((_, index) => `void m${index}`)
  const source = ['// packed-consumer typecheck fixture', ...importLines, ...useLines, 'export {}', ''].join(
    '\n',
  )

  const bundlerFile = path.join(consumerRoot, 'consumer-bundler.ts')
  const nodeNextFile = path.join(consumerRoot, 'consumer-nodenext.mts')
  await writeFile(bundlerFile, source, 'utf8')
  await writeFile(nodeNextFile, source, 'utf8')

  const common = ['--noEmit', '--strict', '--target', 'ES2022', '--skipLibCheck', '--esModuleInterop']

  const compilers = [
    { label: 'TS 5.9', path: path.join(REPO_ROOT, 'node_modules', 'typescript-5-9', 'lib', 'tsc.js') },
    { label: 'TS 6.0', path: path.join(REPO_ROOT, 'node_modules', 'typescript', 'lib', 'tsc.js') },
  ]
  const results = []

  for (const compiler of compilers) {
    try {
      await access(compiler.path, constants.F_OK)
    } catch {
      pushDiag({
        packageName: '(typecheck)',
        mode: compiler.label,
        message: `TypeScript compiler not found at ${compiler.path}`,
      })
      results.push({ label: compiler.label, bundlerOk: false, nodeNextOk: false })
      continue
    }

    const bundler = await runCaptured(
      process.execPath,
      [compiler.path, ...common, '--module', 'ESNext', '--moduleResolution', 'bundler', '--jsx', 'react-jsx', bundlerFile],
      { cwd: consumerRoot, timeout: TSC_TIMEOUT_MS },
    )
    const nodeNext = await runCaptured(
      process.execPath,
      [compiler.path, ...common, '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--jsx', 'react-jsx', nodeNextFile],
      { cwd: consumerRoot, timeout: TSC_TIMEOUT_MS },
    )

    for (const [mode, outcome] of [['bundler', bundler], ['NodeNext', nodeNext]]) {
      if (!outcome.ok) {
        pushDiag({
          packageName: '(typecheck)',
          mode: `${compiler.label} ${mode}`,
          message: truncate((outcome.stdout || outcome.stderr || 'tsc failed').trim(), 2000),
        })
      }
    }
    results.push({ label: compiler.label, bundlerOk: bundler.ok, nodeNextOk: nodeNext.ok })
  }

  return {
    checked: specifiers.length,
    compilers: results,
  }
}

async function main() {
  const packages = await discoverPublicPackages()
  if (packages.length === 0) {
    console.error('packed-consumer check: no public packages discovered under packages/')
    process.exit(1)
  }

  await assertBuildPrerequisite(packages)

  const workRoot = await mkdtemp(path.join(tmpdir(), 'agentskit-packed-consumers-'))
  /** @type {Map<string, string>} */
  const extractMap = new Map()
  /** @type {{ packageName: string, subpath: string, specifier: string, modes: { mode: string }[], exceptionId?: string }[]} */
  const allPlanEntries = []
  let packedCount = 0
  let subpathCount = 0
  let targetCount = 0

  try {
    const tarballsRoot = path.join(workRoot, 'tarballs')
    const extractsRoot = path.join(workRoot, 'extracts')
    await mkdir(tarballsRoot, { recursive: true })
    await mkdir(extractsRoot, { recursive: true })

    for (const pkg of packages) {
      const packResult = await packPackage(pkg.packageRoot, path.join(tarballsRoot, pkg.dir))
      if (!packResult.ok || !packResult.tarballPath) {
        pushDiag({
          packageName: pkg.packageName,
          mode: 'pack',
          message: packResult.detail || 'pnpm pack failed',
        })
        continue
      }
      packedCount += 1

      const extracted = await safeExtractTarball(
        packResult.tarballPath,
        path.join(extractsRoot, pkg.dir),
      )
      for (const err of extracted.errors) {
        pushDiag({
          packageName: pkg.packageName,
          mode: 'tarball',
          message: err,
        })
      }
      if (!extracted.extractRoot) continue

      let packedManifest
      try {
        packedManifest = JSON.parse(
          await readFile(path.join(extracted.extractRoot, 'package.json'), 'utf8'),
        )
      } catch (error) {
        pushDiag({
          packageName: pkg.packageName,
          mode: 'manifest',
          message: `unable to read packed package.json: ${/** @type {Error} */ (error).message}`,
        })
        continue
      }

      targetCount += await validateExtractedPackage(
        extracted.extractRoot,
        pkg.packageName,
        packedManifest,
      )
      extractMap.set(pkg.packageName, extracted.extractRoot)

      const plan = buildValidationPlan(pkg.packageName, packedManifest)
      subpathCount += plan.length
      allPlanEntries.push(...plan)
    }

    let runtimeStats = { esmOk: 0, cjsOk: 0, esmTotal: 0, cjsTotal: 0 }
    let typeStats = { checked: 0, compilers: [] }

    if (extractMap.size > 0) {
      const consumerRoot = path.join(workRoot, 'consumer')
      await mkdir(consumerRoot, { recursive: true })
      await linkConsumerNodeModules(consumerRoot, extractMap)
      runtimeStats = await runBatchRuntimeImports(consumerRoot, allPlanEntries)
      typeStats = await runTypecheckFixtures(consumerRoot, allPlanEntries)
    }

    if (diagnostics.length > 0) {
      const lines = diagnostics.map((d) => `- ${formatDiagnostic(d)}`)
      console.error(`packed-consumer check failed (${diagnostics.length}):\n${lines.join('\n')}`)
      process.exitCode = 1
      return
    }

    console.log(
      [
        'packed-consumer check passed',
        `packages=${packedCount}`,
        `subpaths=${subpathCount}`,
        `targets=${targetCount}`,
        `esm=${runtimeStats.esmOk}/${runtimeStats.esmTotal}`,
        `cjs=${runtimeStats.cjsOk}/${runtimeStats.cjsTotal}`,
        `typecheck=${typeStats.checked} (${typeStats.compilers.map((compiler) => `${compiler.label}:bundler=${compiler.bundlerOk ? 'ok' : 'fail'},NodeNext=${compiler.nodeNextOk ? 'ok' : 'fail'}`).join('; ')})`,
      ].join(' · '),
    )
  } finally {
    await rm(workRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`packed-consumer check crashed: ${error?.stack || error}`)
  process.exitCode = 1
})
