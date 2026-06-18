import { defineConfig } from 'tsup'

export default defineConfig({
  // `index` is client-safe (protocol, tool defs, wire events). `embed` is the
  // Node-only ONNX embedder — a separate entry so importing the protocol never
  // pulls @huggingface/transformers into a browser bundle.
  entry: { index: 'src/index.ts', embed: 'src/embed.ts' },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: false,
  treeshake: true,
  external: ['@huggingface/transformers', '@agentskit/core'],
})
