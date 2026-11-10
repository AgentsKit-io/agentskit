import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
    pure: 'src/pure.ts',
    testing: 'src/testing.ts',
    bin: 'src/bin.ts',
  },
  clean: true,
  // std-env ships ESM only; bundling it keeps the CJS build loadable.
  noExternal: ['std-env'],
  // Keep `node:` specifiers: Deno 2.0 rejects bare built-ins such as 'stream'.
  removeNodeProtocol: false,
})
