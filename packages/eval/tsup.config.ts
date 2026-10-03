import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
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
  clean: false,
  external: ['@agentskit/eval', 'braintrust'],
})
