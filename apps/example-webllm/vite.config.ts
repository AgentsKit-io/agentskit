import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// WebLLM ships large WASM + model shards. Use the Vite default behaviour
// (serve from /public + dynamic import) — no special bundler config
// needed beyond the React plugin.
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // WebGPU + WebLLM threads need cross-origin isolation in some
      // browser configurations.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
