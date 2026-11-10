import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: { index: 'src/index.ts', bin: 'src/bin.ts' },
  clean: true,
  external: ['@agentskit/core', '@agentskit/net', '@agentskit/tools', '@agentskit/runtime', '@agentskit/adapters'],
})
