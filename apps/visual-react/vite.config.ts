import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 4178, strictPort: true },
  preview: { port: 4179, strictPort: true },
})
