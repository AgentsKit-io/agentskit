import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `?raw` imports load the sample markdown corpus as plain strings (see src/rag.ts).
export default defineConfig({
  plugins: [react()],
  // @huggingface/transformers ships large ONNX deps; let Vite pre-bundle on demand
  // rather than eagerly, so the dev server starts fast.
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
})
