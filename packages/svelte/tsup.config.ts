import { defineConfig } from 'tsup'
import esbuildSvelte from 'esbuild-svelte'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  external: ['svelte', 'svelte/store', 'svelte/internal'],
  esbuildPlugins: [esbuildSvelte()],
  // .svelte components can't be typed by tsup's dts bundler; the shim keeps
  // `tsc --noEmit` (lint) happy and consumers get prop types from svelte.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: false,
  treeshake: true,
})
