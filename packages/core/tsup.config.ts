import { copyFile } from 'node:fs/promises'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'agent-schema': 'src/agent-schema.ts',
    'prompt-experiments': 'src/prompt-experiments.ts',
    'auto-summarize': 'src/auto-summarize.ts',
    hitl: 'src/hitl.ts',
    security: 'src/security/index.ts',
    'fuzzy-match': 'src/fuzzy-match.ts',
    finding: 'src/types/finding.ts',
    'compose-tool': 'src/compose-tool.ts',
    'self-debug': 'src/self-debug.ts',
    'generative-ui': 'src/generative-ui.ts',
    a2a: 'src/a2a.ts',
    manifest: 'src/manifest.ts',
    'eval-format': 'src/eval-format.ts',
    'memory-validation': 'src/memory-validation.ts',
    'tool-proposal': 'src/tool-proposal.ts',
    'tool-proposal-internal': 'src/tool-proposal-internal.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: false,
  treeshake: true,
  external: ['./tool-proposal-internal.js'],
  // tsup ships .ts entrypoints only; copy bundled JSON assets manually.
  async onSuccess() {
    await copyFile('src/security/default-taxonomy.json', 'dist/default-taxonomy.json')
  },
})
