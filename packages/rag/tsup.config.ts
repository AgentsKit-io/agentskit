import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index-node.ts',
      chunker: 'src/chunker.ts',
    },
    format: ['esm', 'cjs'],
    dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
    sourcemap: true,
    clean: true,
    external: ['@agentskit/core'],
    treeshake: true,
  },
  {
    entry: {
      'index.browser': 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: false,
    sourcemap: true,
    clean: false,
    external: ['@agentskit/core'],
    treeshake: true,
  },
])
