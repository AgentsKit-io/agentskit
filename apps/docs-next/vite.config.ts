import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vinext from "vinext";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { staticAssetsAdapter } from "@vinext/cloudflare/cache/static-assets-adapter";

export default defineConfig({
  resolve: {
    alias: {
      // onnxruntime-node is native; on Workers the ask-docs embedder uses Workers AI (lib/rag/embed.ts).
      "@huggingface/transformers": fileURLToPath(new URL("./lib/rag/transformers-workers-stub.ts", import.meta.url)),
      // /llms-full.txt reads MDX with fs, which Workers lack: use the snapshot-backed variant.
      [fileURLToPath(new URL("./app/llms-full.txt/route.ts", import.meta.url))]: fileURLToPath(new URL("./cloudflare/llms-full-route.ts", import.meta.url)),
      // Page bodies snapshot written by scripts/gen-llms-full.mjs (gitignored; typed in cloudflare/llms-full-pages.d.ts).
      "virtual:llms-full-pages": fileURLToPath(new URL("./lib/llms-full-pages.generated.json", import.meta.url)),
    },
  },
  plugins: [
    // Compile content/**/*.mdx (and generate .source/) like fumadocs-mdx/next does for `next build`.
    fumadocsMdx(),
    // Read-only page cache prerendered at build into Workers Static Assets (free; a deploy refreshes
    // it). The workers-cache CDN adapter looped on redirects in the registry.
    vinext({
      cache: { cdn: staticAssetsAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
