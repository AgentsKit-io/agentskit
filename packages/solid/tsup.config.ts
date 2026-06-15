import { defineConfig } from 'tsup'
import { solidPlugin } from 'esbuild-plugin-solid'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  external: ['solid-js', 'solid-js/store', 'solid-js/web'],
  esbuildPlugins: [solidPlugin()],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: false,
  treeshake: true,
})
