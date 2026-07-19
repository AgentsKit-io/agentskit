import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    sandbox: 'src/sandbox.ts',
    types: 'src/types.ts',
    'web/index': 'src/web/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@e2b/code-interpreter'],
})
