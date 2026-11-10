import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    scorers: 'src/scorers/index.ts',
    ci: 'src/ci.ts',
  },
  clean: false,
  external: ['braintrust'],
})
