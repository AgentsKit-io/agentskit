import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    pure: 'src/pure.ts',
    testing: 'src/testing.ts',
    bin: 'src/bin.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  // std-env ships ESM only; bundling it keeps the CJS build loadable.
  noExternal: ['std-env'],
  // Keep `node:` specifiers: Deno 2.0 rejects bare built-ins such as 'stream'.
  removeNodeProtocol: false,
})
