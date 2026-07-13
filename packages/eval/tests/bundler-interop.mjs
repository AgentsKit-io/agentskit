import { execFile } from 'node:child_process'
import { cp, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { loadConfig, runBuild } from 'metro'
import { build as viteBuild } from 'vite'

const execute = promisify(execFile)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(packageRoot, '../..')
const metroRuntimeRoot = await realpath(resolve(packageRoot, 'node_modules/metro-runtime'))
const typeScriptCli = resolve(packageRoot, 'node_modules/typescript/bin/tsc')

async function linkPackage(projectRoot, name, target) {
  const destination = join(projectRoot, 'node_modules', ...name.split('/'))
  await mkdir(dirname(destination), { recursive: true })
  await symlink(target, destination, 'dir')
}

async function verifyNodeIo() {
  const projectRoot = await mkdtemp(join(tmpdir(), 'agentskit-eval-node-'))
  try {
    const installedEval = join(projectRoot, 'node_modules/@agentskit/eval')
    await mkdir(installedEval, { recursive: true })
    await cp(resolve(packageRoot, 'dist'), join(installedEval, 'dist'), { recursive: true })
    await cp(resolve(packageRoot, 'package.json'), join(installedEval, 'package.json'))
    await linkPackage(projectRoot, '@agentskit/core', resolve(repositoryRoot, 'packages/core'))

    await writeFile(join(projectRoot, 'fixture.mjs'), [
      "import { createCassette } from '@agentskit/eval/replay'",
      "import { saveCassette, loadCassette } from '@agentskit/eval/replay/io'",
      "const path = new URL('./esm/cassette.json', import.meta.url).pathname",
      "await saveCassette(path, createCassette({ seed: 'esm' }))",
      "if ((await loadCassette(path)).seed !== 'esm') throw new Error('ESM cassette mismatch')",
    ].join('\n'))
    await writeFile(join(projectRoot, 'fixture.cjs'), [
      "const { createCassette } = require('@agentskit/eval/replay')",
      "const { saveCassette, loadCassette } = require('@agentskit/eval/replay/io')",
      "const { join } = require('node:path')",
      ";(async () => {",
      "  const path = join(__dirname, 'cjs', 'cassette.json')",
      "  await saveCassette(path, createCassette({ seed: 'cjs' }))",
      "  if ((await loadCassette(path)).seed !== 'cjs') throw new Error('CJS cassette mismatch')",
      "})().catch(error => { console.error(error); process.exitCode = 1 })",
    ].join('\n'))

    await execute(process.execPath, ['fixture.mjs'], { cwd: projectRoot })
    await execute(process.execPath, ['fixture.cjs'], { cwd: projectRoot })
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
}

async function verifyVite(projectRoot) {
  const entry = join(projectRoot, 'vite-entry.js')
  const outDir = join(projectRoot, 'vite-dist')
  await writeFile(entry, "import { createCassette } from '@agentskit/eval/replay'; globalThis.__agentskitEval = createCassette;\n")
  await viteBuild({
    root: projectRoot,
    logLevel: 'silent',
    resolve: { preserveSymlinks: true },
    build: { lib: { entry, formats: ['es'], fileName: () => 'bundle.js' }, outDir },
  })
  const bundle = await readFile(join(outDir, 'bundle.js'), 'utf8')
  if (!bundle.includes('__agentskitEval')) throw new Error('Vite bundle omitted the public replay entry')
  if (/node:(?:fs|path)|fs\/promises/u.test(bundle)) throw new Error('Vite bundle contains Node IO')
}

async function verifyBundlerTypes(projectRoot) {
  const validEntry = join(projectRoot, 'valid.ts')
  const invalidEntry = join(projectRoot, 'invalid.ts')
  const nodeEntry = join(projectRoot, 'node-valid.mts')
  const argumentsFor = entry => [
    typeScriptCli,
    '--noEmit',
    '--module', 'ESNext',
    '--moduleResolution', 'bundler',
    '--target', 'ES2022',
    '--skipLibCheck',
    entry,
  ]
  await writeFile(validEntry, "import { createCassette, saveCassette } from '@agentskit/eval/replay'; createCassette(); void saveCassette;\n")
  await execute(process.execPath, argumentsFor(validEntry), { cwd: projectRoot })

  await writeFile(nodeEntry, "import { saveCassette } from '@agentskit/eval/replay'; void saveCassette;\n")
  await execute(process.execPath, [
    typeScriptCli,
    '--noEmit',
    '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext',
    '--target', 'ES2022',
    '--skipLibCheck',
    nodeEntry,
  ], { cwd: projectRoot })

  await writeFile(invalidEntry, "import { missingReplayExport } from '@agentskit/eval/replay'; void missingReplayExport;\n")
  try {
    await execute(process.execPath, argumentsFor(invalidEntry), { cwd: projectRoot })
    throw new Error('Bundler TypeScript accepted an unknown replay export')
  } catch (error) {
    if (error instanceof Error && error.message === 'Bundler TypeScript accepted an unknown replay export') throw error
    const stdout = typeof error === 'object' && error !== null && 'stdout' in error ? String(error.stdout) : ''
    if (!stdout.includes("has no exported member 'missingReplayExport'")) throw error
  }
}

async function verifyMetro(projectRoot) {
  const entry = join(projectRoot, 'index.js')
  await writeFile(entry, "import { createCassette, saveCassette } from '@agentskit/eval/replay'; globalThis.__agentskitEval = [createCassette, saveCassette];\n")
  const baseConfig = await loadConfig({ cwd: projectRoot, projectRoot })
  const config = {
    ...baseConfig,
    projectRoot,
    watchFolders: [projectRoot, repositoryRoot, metroRuntimeRoot],
    resolver: {
      ...baseConfig.resolver,
      useWatchman: false,
      nodeModulesPaths: [join(projectRoot, 'node_modules'), join(repositoryRoot, 'node_modules')],
      unstable_enablePackageExports: true,
      unstable_conditionsByPlatform: {
        ...baseConfig.resolver.unstable_conditionsByPlatform,
        ios: ['react-native'],
        android: ['react-native'],
        web: ['browser'],
      },
    },
  }

  for (const platform of ['web', 'ios']) {
    const output = join(projectRoot, `bundle.${platform}.js`)
    await runBuild(config, { entry: 'index.js', dev: false, minify: false, out: output, platform, sourceMap: false })
    const bundle = await readFile(output, 'utf8')
    if (!bundle.includes('__agentskitEval')) throw new Error(`Metro ${platform} bundle omitted the public replay entry`)
    if (/node:(?:fs|path)|fs\/promises/u.test(bundle)) throw new Error(`Metro ${platform} bundle contains Node IO`)
  }
}

export async function runBundlerInteropChecks() {
  const universalSource = await readFile(resolve(packageRoot, 'dist/replay.browser.js'), 'utf8')
  if (/\bimport\s*\(/u.test(universalSource)) throw new Error('The universal replay entry contains a dynamic import')
  if (/node:(?:fs|path)|fs\/promises/u.test(universalSource)) throw new Error('The universal replay entry contains Node IO')

  const universalEntry = await import(new URL('../dist/replay.browser.js', import.meta.url).href)
  const universalIoCalls = [
    () => universalEntry.saveCassette('fixture.json', universalEntry.createCassette()),
    () => universalEntry.loadCassette('fixture.json'),
  ]
  for (const call of universalIoCalls) {
    try {
      await call()
      throw new Error('Universal cassette IO unexpectedly succeeded')
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('available only in Node.js')) throw error
    }
  }

  await verifyNodeIo()

  const projectRoot = await mkdtemp(join(tmpdir(), 'agentskit-eval-bundlers-'))
  try {
    await linkPackage(projectRoot, '@agentskit/eval', packageRoot)
    await linkPackage(projectRoot, '@agentskit/core', resolve(repositoryRoot, 'packages/core'))
    await linkPackage(projectRoot, 'metro-runtime', metroRuntimeRoot)
    await verifyBundlerTypes(projectRoot)
    await verifyVite(projectRoot)
    await verifyMetro(projectRoot)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
}
