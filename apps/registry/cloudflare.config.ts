import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "agentskit-registry",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-02",
    compatibilityFlags: ["nodejs_compat"],
    // Private prerender cache files are only served through the Worker.
    assets: { notFoundHandling: "none", runWorkerFirst: ["/_vinext/static-cache/*"] },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
