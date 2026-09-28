#!/usr/bin/env node
// Bundles the built ESM entry of @agentskit/core with everything it statically
// imports (tsup's shared `chunk-*.js` files) into one file, so `.size-limit.json`
// measures what a consumer actually pays for `import ... from '@agentskit/core'`.
// Measuring `dist/index.js` alone skips the chunks and under-reports the cost.
// Dynamic `import()` targets stay external: they load lazily, not at import time.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = join(root, 'node_modules/.cache/size-limit/core-esm-closure.js')

mkdirSync(dirname(outfile), { recursive: true })
await build({
  entryPoints: [join(root, 'packages/core/dist/index.js')],
  outfile,
  bundle: true,
  format: 'esm',
  minify: true,
  treeShaking: true,
  logLevel: 'error',
  plugins: [
    {
      name: 'lazy-imports-external',
      setup(b) {
        b.onResolve({ filter: /.*/ }, args =>
          args.kind === 'dynamic-import' ? { path: args.path, external: true } : undefined,
        )
      },
    },
  ],
})
