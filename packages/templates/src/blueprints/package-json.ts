import type { ScaffoldConfig, ScaffoldType } from '../scaffold'
import { packageName } from './utils'

/**
 * Per-scaffold-type runtime dependency set. Every package depends on
 * `@agentskit/core`; tool/skill scaffolds need only that.
 * Adapter / embedder / browser-adapter pull in the adapters package.
 * Memory / flow / runtime-adjacent scaffolds pull the runtime.
 */
const EXTRA_DEPS: Partial<Record<ScaffoldType, Record<string, string>>> = {
  adapter: { '@agentskit/adapters': '*' },
  embedder: { '@agentskit/adapters': '*' },
  'browser-adapter': { '@agentskit/adapters': '*' },
  'memory-vector': { '@agentskit/memory': '*' },
  'memory-chat': { '@agentskit/memory': '*' },
  flow: { '@agentskit/runtime': '*' },
}

export function generatePackageJson(config: ScaffoldConfig): string {
  const baseDeps: Record<string, string> = { '@agentskit/core': '*' }
  const extra = EXTRA_DEPS[config.type] ?? {}

  return JSON.stringify({
    name: packageName(config.name),
    version: '0.1.0',
    description: config.description ?? `AgentsKit ${config.type}: ${config.name}`,
    type: 'module',
    main: './dist/index.cjs',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
    },
    files: ['dist'],
    publishConfig: { access: 'public' },
    scripts: {
      build: 'tsup',
      test: 'vitest run',
      lint: 'tsc --noEmit',
    },
    dependencies: {
      ...baseDeps,
      ...extra,
    },
    devDependencies: {
      tsup: '^8.5.0',
      typescript: '^6.0.2',
      vitest: '^4.1.2',
    },
  }, null, 2)
}
