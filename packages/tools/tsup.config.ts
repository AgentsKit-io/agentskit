import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    mcp: 'src/mcp/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: false,
  treeshake: true,
})
