import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'agent-schema': 'src/agent-schema.ts',
    'prompt-experiments': 'src/prompt-experiments.ts',
    'auto-summarize': 'src/auto-summarize.ts',
    hitl: 'src/hitl.ts',
    security: 'src/security/index.ts',
    'compose-tool': 'src/compose-tool.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: false,
  treeshake: true,
})
