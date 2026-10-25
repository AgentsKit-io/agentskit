import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    sandbox: 'src/sandbox.ts',
    types: 'src/types.ts',
    'web/index': 'src/web/index.ts',
  },
  clean: true,
  external: ['@e2b/code-interpreter'],
})
