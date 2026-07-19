import type { ScaffoldConfig, ScaffoldType } from '../scaffold-config'
import { packageName } from './utils'

/**
 * Per-scaffold-type runtime dependency set.
 *
 * Only packages actually imported by the generated source are listed.
 * Versions are pinned with caret ranges — never wildcards.
 * - Everyone depends on `@agentskit/core` ^1.0.0
 * - `flow` also depends on `@agentskit/runtime` ^0.10.0
 */
const EXTRA_DEPS: Partial<Record<ScaffoldType, Record<string, string>>> = {
  flow: { '@agentskit/runtime': '^0.10.0' },
}

export function generatePackageJson(config: ScaffoldConfig): string {
  const baseDeps: Record<string, string> = { '@agentskit/core': '^1.0.0' }
  const extra = EXTRA_DEPS[config.type] ?? {}

  return JSON.stringify(
    {
      name: packageName(config.name),
      version: '0.1.0',
      description: config.description ?? `AgentsKit ${config.type}: ${config.name}`,
      type: 'module',
      license: 'MIT',
      sideEffects: false,
      engines: { node: '>=20' },
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
    },
    null,
    2,
  )
}
