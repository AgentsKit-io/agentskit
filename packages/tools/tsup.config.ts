import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    mcp: 'src/mcp/index.ts',
    integrations: 'src/integrations/index.ts',
    'mcp-devtools': 'src/mcp-devtools/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: false,
  treeshake: true,
})
