import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    replay: 'src/replay/index.ts',
    'replay.browser': 'src/replay/universal.ts',
    'replay-io': 'src/replay/io.ts',
    snapshot: 'src/snapshot/index.ts',
    diff: 'src/diff/index.ts',
    ci: 'src/ci/index.ts',
    braintrust: '../eval-braintrust/src/index.ts',
    'braintrust-scorers': '../eval-braintrust/src/scorers/index.ts',
    'braintrust-ci': '../eval-braintrust/src/ci.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: false,
  treeshake: true,
  external: ['@agentskit/eval', 'braintrust'],
})
