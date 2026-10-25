import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: { index: 'src/index.ts', rules: 'src/rules.ts' },
  clean: true,
  // eventsource-parser ships ESM only; bundling it keeps the CJS build loadable.
  noExternal: ['eventsource-parser'],
})
