import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    createAdapter: 'src/createAdapter.ts',
    'cli/index': 'src/cli/index.ts',
    'catalog/index': 'src/catalog/index.ts',
    'langchain-bridge': 'src/langchain-bridge.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  external: ['@agentskit/core', /^@langchain\/core/],
  treeshake: true,
})
