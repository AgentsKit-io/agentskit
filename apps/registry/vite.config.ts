import { defineConfig } from "vite";
import vinext from "vinext";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { staticAssetsAdapter } from "@vinext/cloudflare/cache/static-assets-adapter";

export default defineConfig({
  plugins: [
    // Compile content/**/*.mdx (and generate .source/) like fumadocs-mdx/next does for `next build`.
    fumadocsMdx(),
    // Read-only page cache prerendered at build into Workers Static Assets (free tier; a deploy
    // refreshes it). The workers-cache CDN adapter looped on redirects (/for-agents, /favicon.ico).
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
