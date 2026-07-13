import { cp, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadConfig, runBuild } from 'metro'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(packageRoot, '../..')
const metroRuntimeRoot = await realpath(resolve(packageRoot, 'node_modules/metro-runtime'))

async function linkPackage(projectRoot, name, target) {
  const destination = join(projectRoot, 'node_modules', ...name.split('/'))
  await mkdir(dirname(destination), { recursive: true })
  await symlink(target, destination, 'dir')
}

async function verifyLazyNodePeer() {
  const projectRoot = await mkdtemp(join(tmpdir(), 'agentskit-rag-node-'))
  try {
    const installedRag = join(projectRoot, 'node_modules/@agentskit/rag')
    await mkdir(installedRag, { recursive: true })
    await cp(resolve(packageRoot, 'dist'), join(installedRag, 'dist'), { recursive: true })
    await cp(resolve(packageRoot, 'package.json'), join(installedRag, 'package.json'))
    await linkPackage(projectRoot, '@agentskit/core', resolve(repositoryRoot, 'packages/core'))

    const sdkRoot = join(projectRoot, 'node_modules/@aws-sdk/client-s3')
    await mkdir(sdkRoot, { recursive: true })
    await writeFile(join(sdkRoot, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }))
    await writeFile(join(sdkRoot, 'index.js'), [
      'export class ListObjectsV2Command { constructor(input) { this.input = input } }',
      'export class GetObjectCommand { constructor(input) { this.input = input } }',
    ].join('\n'))

    const client = {
      send: async command => 'Key' in command.input
        ? { Body: { transformToString: async () => 'body' } }
        : { Contents: [{ Key: 'doc.txt' }], IsTruncated: false },
    }
    const nodeEntry = await import(pathToFileURL(join(installedRag, 'dist/index.js')).href)
    const docs = await nodeEntry.loadS3({
      bucket: 'fixture',
      client,
    })
    if (docs[0]?.source !== 's3://fixture/doc.txt') {
      throw new Error('The Node ESM entry did not lazily resolve the installed S3 peer')
    }

    const requireFromFixture = createRequire(join(projectRoot, 'fixture.cjs'))
    const cjsEntry = requireFromFixture(join(installedRag, 'dist/index.cjs'))
    const cjsDocs = await cjsEntry.loadS3({ bucket: 'fixture', client })
    if (cjsDocs[0]?.source !== 's3://fixture/doc.txt') {
      throw new Error('The Node CJS entry did not lazily resolve the installed S3 peer')
    }
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
}

export async function runMetroBundleChecks() {
  const projectRoot = await mkdtemp(join(tmpdir(), 'agentskit-rag-metro-'))
  try {
  const universalSource = await readFile(resolve(packageRoot, 'dist/index.browser.js'), 'utf8')
  if (/\bimport\s*\(/u.test(universalSource)) {
    throw new Error('The universal RAG entry contains a dynamic import')
  }

  const nodeEntry = await import(pathToFileURL(resolve(packageRoot, 'dist/index.js')).href)
  try {
    await nodeEntry.loadS3({ client: { send: async () => ({}) }, bucket: 'fixture' })
    throw new Error('The Node RAG entry unexpectedly resolved a missing S3 peer')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Install @aws-sdk/client-s3')) {
      throw error
    }
  }

  await verifyLazyNodePeer()
  await linkPackage(projectRoot, '@agentskit/rag', packageRoot)
  await linkPackage(projectRoot, '@agentskit/core', resolve(repositoryRoot, 'packages/core'))
  await linkPackage(projectRoot, 'metro-runtime', metroRuntimeRoot)
  await writeFile(
    join(projectRoot, 'index.js'),
    "import { createRAG } from '@agentskit/rag'; globalThis.__agentskitRag = createRAG;\n",
  )

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
    await runBuild(config, {
      entry: 'index.js',
      dev: false,
      minify: false,
      out: output,
      platform,
      sourceMap: false,
    })
    const bundle = await readFile(output, 'utf8')
    if (!bundle.includes('__agentskitRag')) {
      throw new Error(`Metro ${platform} bundle did not include the public RAG entry point`)
    }
  }
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
}
