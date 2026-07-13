import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    personalization: 'src/personalization.ts',
    'web-storage': 'src/web-storage.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: false,
  treeshake: true,
  external: ['better-sqlite3', 'redis', 'vectra', '@lancedb/lancedb'],
})
