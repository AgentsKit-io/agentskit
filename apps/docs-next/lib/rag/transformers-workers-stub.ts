// Vite (vinext → Cloudflare Workers) build only: Transformers.js + onnxruntime-node cannot run on
// Workers, where lib/rag/embed.ts uses Workers AI instead. `next build` keeps the real package.
export const env: Record<string, unknown> = {}
export async function pipeline(): Promise<never> {
  throw new Error('[ask-docs] Transformers.js is not available on Cloudflare Workers')
}
