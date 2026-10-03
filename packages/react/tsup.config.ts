import { copyFileSync, mkdirSync } from 'node:fs'
import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'

export default defineConfig({
  ...sharedTsupOptions,
  entry: {
    index: 'src/index.ts',
  },
  clean: true,
  external: ['react', 'react-dom', '@agentskit/core'],
  onSuccess: async () => {
    mkdirSync('dist/theme', { recursive: true })
    copyFileSync('src/theme/tokens.css', 'dist/theme/tokens.css')
    copyFileSync('src/theme/default.css', 'dist/theme/default.css')
  },
})
