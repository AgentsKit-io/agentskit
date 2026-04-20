import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

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
  { source: '/docs/agents/tools', destination: '/docs/agents/tools', permanent: false }, // self no-op retained for old redirect fallback

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

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return DOC_REDIRECTS.filter((r) => r.source !== r.destination)
  },
}

export default withMDX(config)
