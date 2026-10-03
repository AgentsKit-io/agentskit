import { defineConfig } from 'tsup'
import { sharedTsupOptions } from '../../tsup.shared'
import { solidPlugin } from 'esbuild-plugin-solid'

export default defineConfig({
  ...sharedTsupOptions,
  entry: { index: 'src/index.ts', 'use-chat': 'src/useChat.ts' },
  external: ['solid-js', 'solid-js/store', 'solid-js/web'],
  esbuildPlugins: [solidPlugin()],
  clean: false,
})
