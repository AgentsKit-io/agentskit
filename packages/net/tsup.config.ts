import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  // eventsource-parser ships ESM only; bundling it keeps the CJS build loadable.
  noExternal: ['eventsource-parser'],
})
