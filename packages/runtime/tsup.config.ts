import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    runners: 'src/runners/index.ts',
    'shared-context': 'src/shared-context.ts',
  },
  clean: false,
})
