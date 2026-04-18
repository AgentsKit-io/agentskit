import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    replay: 'src/replay/index.ts',
    snapshot: 'src/snapshot/index.ts',
    diff: 'src/diff/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: false,
  treeshake: true,
})
