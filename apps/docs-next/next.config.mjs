import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createMDX } from 'fumadocs-mdx/next'
import { LEGACY_404_REDIRECTS } from './legacy-404-redirects.mjs'

const apiSymbolRoutes = JSON.parse(readFileSync(new URL('./lib/api-symbol-routes.json', import.meta.url), 'utf8'))
const apiCategoryRoutes = new Set(Object.values(apiSymbolRoutes).map((route) => route.split('#')[0]))

const withMDX = createMDX()
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Redirects cover:
 *   1. The original IA overhaul (legacy `/docs/adapters`, `/docs/chat-uis`, etc).
 *   2. The tab restructure (everything moved under 6 tab roots).
 */
const DOC_REDIRECTS = [
  // Legacy → first IA pass (kept for back-compat)
  { source: '/docs/adapters/:slug*', destination: '/docs/data/providers/:slug*', permanent: true },
  { source: '/docs/data-layer/memory/:slug*', destination: '/docs/data/memory/:slug*', permanent: true },
  { source: '/docs/data-layer/rag/:slug*', destination: '/docs/data/rag/:slug*', permanent: true },
  { source: '/docs/data-layer/:slug*', destination: '/docs/data/:slug*', permanent: true },
  { source: '/docs/chat-uis/:slug*', destination: '/docs/ui/:slug*', permanent: true },
  { source: '/docs/components/:slug*', destination: '/docs/ui/:slug*', permanent: true },
  { source: '/docs/hooks/:slug*', destination: '/docs/ui/:slug*', permanent: true },
  { source: '/docs/contributing/:slug*', destination: '/docs/reference/contribute/:slug*', permanent: true },
  { source: '/docs/theming', destination: '/docs/ui/theming', permanent: true },

  // Cookbook consolidation — retain old URLs and point to maintained guides.
  { source: '/docs/cookbook/streaming', destination: '/docs/get-started/getting-started/quickstart', permanent: true },
  { source: '/docs/cookbook/rate-limit', destination: '/docs/production/security/rate-limiting', permanent: true },
  { source: '/docs/cookbook/tool-confirmation', destination: '/docs/agents/hitl', permanent: true },
  { source: '/docs/cookbook/edge-deployment', destination: '/docs/production/edge', permanent: true },
  // The package guide is the canonical home for templates API and setup.
  { source: '/docs/reference/recipes/templates-cookbook', destination: '/docs/reference/packages/templates', permanent: true },
  // Retire orphaned integration-specific recipes; their canonical guides remain.
  { source: '/docs/reference/recipes/figma-design-extraction', destination: '/docs/agents/tools/integrations/figma', permanent: true },
  { source: '/docs/reference/recipes/hubspot-airtable-shopify-pulse', destination: '/docs/agents/tools/integrations/hubspot', permanent: true },
  { source: '/docs/reference/recipes/jira-triage', destination: '/docs/agents/tools/integrations/jira', permanent: true },
  { source: '/docs/reference/recipes/sentry-incident-bot', destination: '/docs/agents/tools/integrations/sentry', permanent: true },
  // Replace duplicate recipe overviews with canonical integration and provider references.
  { source: '/docs/reference/recipes/integrations', destination: '/docs/agents/tools/integrations', permanent: true },
  { source: '/docs/reference/recipes/more-providers', destination: '/docs/data/providers/hosted', permanent: true },

  // Tab restructure — Get started
  { source: '/docs/concepts/:slug*', destination: '/docs/get-started/concepts/:slug*', permanent: true },
  { source: '/docs/getting-started/:slug*', destination: '/docs/get-started/getting-started/:slug*', permanent: true },
  { source: '/docs/announcements/:slug*', destination: '/docs/get-started/announcements/:slug*', permanent: true },
  { source: '/docs/migrating/:slug*', destination: '/docs/get-started/migrating/:slug*', permanent: true },
  { source: '/docs/comparison', destination: '/docs/get-started/comparison', permanent: true },

  // Tab restructure — Agents (absorbs tools + skills)
  { source: '/docs/tools/:slug*', destination: '/docs/agents/tools/:slug*', permanent: true },
  { source: '/docs/tools', destination: '/docs/agents/tools', permanent: true },
  { source: '/docs/skills/:slug*', destination: '/docs/agents/skills/:slug*', permanent: true },
  { source: '/docs/skills', destination: '/docs/agents/skills', permanent: true },

  // Tab restructure — Production
  { source: '/docs/observability/:slug*', destination: '/docs/production/observability/:slug*', permanent: true },
  { source: '/docs/observability', destination: '/docs/production/observability', permanent: true },
  { source: '/docs/security/:slug*', destination: '/docs/production/security/:slug*', permanent: true },
  { source: '/docs/security', destination: '/docs/production/security', permanent: true },
  { source: '/docs/evals/:slug*', destination: '/docs/production/evals/:slug*', permanent: true },
  { source: '/docs/evals', destination: '/docs/production/evals', permanent: true },
  { source: '/docs/cli/:slug*', destination: '/docs/production/cli/:slug*', permanent: true },
  { source: '/docs/cli', destination: '/docs/production/cli', permanent: true },
  { source: '/docs/infrastructure/observability/:slug*', destination: '/docs/production/observability/:slug*', permanent: true },
  { source: '/docs/infrastructure/eval/:slug*', destination: '/docs/production/evals/:slug*', permanent: true },
  { source: '/docs/infrastructure/cli/:slug*', destination: '/docs/production/cli/:slug*', permanent: true },
  { source: '/docs/infrastructure/:slug*', destination: '/docs/reference/packages/:slug*', permanent: true },

  // Tab restructure — Reference
  { source: '/docs/packages/integrations', destination: '/docs/for-agents/integrations', permanent: true },
  { source: '/docs/packages/:slug*', destination: '/docs/reference/packages/:slug*', permanent: true },
  { source: '/docs/packages', destination: '/docs/reference/packages', permanent: true },
  // For agents is its own top-level tab — keep the short legacy path working
  { source: '/docs/reference/for-agents/:slug*', destination: '/docs/for-agents/:slug*', permanent: true },
  { source: '/docs/reference/for-agents', destination: '/docs/for-agents', permanent: true },
  { source: '/docs/recipes/:slug*', destination: '/docs/reference/recipes/:slug*', permanent: true },
  { source: '/docs/recipes', destination: '/docs/reference/recipes', permanent: true },
  { source: '/docs/examples/:slug*', destination: '/docs/reference/examples/:slug*', permanent: true },
  { source: '/docs/examples', destination: '/docs/reference/examples', permanent: true },
  { source: '/docs/specs/:slug*', destination: '/docs/reference/specs/:slug*', permanent: true },
  { source: '/docs/specs', destination: '/docs/reference/specs', permanent: true },
  { source: '/docs/contribute/:slug*', destination: '/docs/reference/contribute/:slug*', permanent: true },
  { source: '/docs/contribute', destination: '/docs/reference/contribute', permanent: true },
]

// Search Console URL-level 404 fixes captured on 2026-08-13. These are
// explicit destinations verified on the live site; crawler garbage and sample
// file paths are intentionally not redirected.
const GSC_404_REDIRECTS = [
  { source: '/docs/durable', destination: '/docs/agents/durable', permanent: true },
  { source: '/docs/reference/packages/catalog', destination: '/docs/reference/packages/adapters', permanent: true },
  { source: '/docs/agents/pr-reviewer', destination: '/docs/agents/skills/pr-reviewer', permanent: true },
  { source: '/docs/agents/sql-analyst', destination: '/docs/agents/skills/sql-analyst', permanent: true },
  { source: '/docs/api/rag/classes', destination: '/docs/api/rag', permanent: true },
  { source: '/docs/api/runtime/interfaces/ChatSurfaceChannel.md', destination: '/docs/api/runtime/interfaces#interface-chatsurfacechannel', permanent: true },
  { source: '/docs/api/memory/type-aliases/SqliteOpener.md', destination: '/docs/api/memory/type-aliases#type-alias-sqliteopener', permanent: true },
  { source: '/docs/api/rag/type-aliases/RagErrorCode.md', destination: '/docs/api/rag/type-aliases#type-alias-ragerrorcode', permanent: true },
  { source: '/docs/api/memory/interfaces/MemoryVectorStoreLike.md', destination: '/docs/api/memory/interfaces#interface-memoryvectorstorelike', permanent: true },
  { source: '/docs/api/observability/type-aliases/TimelineRow.md', destination: '/docs/api/observability/type-aliases#type-alias-timelinerow', permanent: true },
  { source: '/docs/api/memory/interfaces/LocalStorageLike.md', destination: '/docs/api/memory/interfaces#interface-localstoragelike', permanent: true },
  { source: '/docs/api/runtime/type-aliases/VoteBallot.md', destination: '/docs/api/runtime/type-aliases#type-alias-voteballot', permanent: true },
  { source: '/docs/api/memory/interfaces/RedisLike.md', destination: '/docs/api/memory/interfaces#interface-redislike', permanent: true },
  { source: '/docs/api/memory/interfaces/CreateVectorStoreOpts.md', destination: '/docs/api/memory/interfaces#interface-createvectorstoreopts', permanent: true },
  { source: '/docs/api/runtime/type-aliases/TopologyRunAgent.md', destination: '/docs/api/runtime/type-aliases#type-alias-topologyrunagent-lt-ctx-gt', permanent: true },
  { source: '/docs/api/observability/type-aliases/ReplayHandler.md', destination: '/docs/api/observability/type-aliases#type-alias-replayhandler-lt-e-gt', permanent: true },
  { source: '/docs/api/memory/interfaces/CreateKvMemoryFromConfigOpts.md', destination: '/docs/api/memory/interfaces#interface-createkvmemoryfromconfigopts', permanent: true },
  { source: '/docs/api/memory/interfaces/SqliteLike.md', destination: '/docs/api/memory/interfaces#interface-sqlitelike', permanent: true },
  { source: '/docs/api/observability/type-aliases/BisectVerdict.md', destination: '/docs/api/observability/type-aliases#type-alias-bisectverdict', permanent: true },
  { source: '/docs/api/memory/interfaces/MemoryEmbedderLike.md', destination: '/docs/api/memory/interfaces#interface-memoryembedderlike', permanent: true },
  { source: '/docs/api/memory/interfaces/SqliteStmt.md', destination: '/docs/api/memory/interfaces#interface-sqlitestmt', permanent: true },
  { source: '/docs/api/observability/type-aliases/StateDiffEntry.md', destination: '/docs/api/observability/type-aliases#type-alias-statediffentry', permanent: true },
  { source: '/docs/api/runtime/type-aliases/CompareSelection.md', destination: '/docs/api/runtime/type-aliases#type-alias-compareselection', permanent: true },
  { source: '/docs/api/memory/type-aliases/KvMemoryConfig.md', destination: '/docs/api/memory/type-aliases#type-alias-kvmemoryconfig', permanent: true },
  { source: '/docs/api/observability/type-aliases/ReplayOracle.md', destination: '/docs/api/observability/type-aliases#type-alias-replayoracle', permanent: true },
]

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.*.*'],
  // The Ask-the-docs route runs `@huggingface/transformers` (ONNX) in-process for
  // local query embeddings. It MUST NOT be bundled into the serverless function —
  // bundling its onnxruntime backend breaks it at runtime, surfacing as
  // "[ask-docs] retrieval failed". Keeping it external resolves it from
  // node_modules in the function (via output file tracing) at runtime instead.
  serverExternalPackages: ['@huggingface/transformers'],
  // The ask-docs embedder uses onnxruntime-node, whose native `.so`/`.node`
  // binaries are loaded via dlopen and therefore NOT picked up by Vercel's
  // (static) output file tracing — the function then fails at query time with
  // "libonnxruntime.so.1: cannot open shared object file". Force the Linux
  // binaries into the function. `outputFileTracingRoot` points at the monorepo
  // root so the pnpm store path resolves.
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    // Both relative forms — globs may resolve from the app dir or the tracing
    // root depending on Next's monorepo handling; the non-matching one is a no-op.
    '/api/ask-docs': [
      '../../node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/**/*',
      './node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v*/linux/**/*',
    ],
  },
  async redirects() {
    // Legacy 404 fixes first — first match wins, so explicit per-URL rules
    // override the broad wildcard rules that used to chain into dead targets.
    return [...LEGACY_404_REDIRECTS, ...GSC_404_REDIRECTS, ...DOC_REDIRECTS].filter(
      (r) => r.source !== r.destination && !apiCategoryRoutes.has(r.source),
    )
  },
  async headers() {
    return [{
      source: '/deterministic-knowledge/:hash.json',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }]
  },
}

export default withMDX(config)
