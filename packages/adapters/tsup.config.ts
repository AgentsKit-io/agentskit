import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    createAdapter: 'src/createAdapter.ts',
    'catalog/index': 'src/catalog/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  external: ['@agentskit/core'],
  treeshake: true,
})
