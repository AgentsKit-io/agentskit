const DEFAULT_SHELL_ORIGIN = 'https://www.agentskit.io'

/**
 * Origin of the shared AgentsKit shell (/shell/v1.js + /shell/v1.css), hosted by the
 * AgentsKit site. Development without an override uses this app's fallback copy in
 * public/shell/, kept in sync by scripts/sync-ecosystem.mjs.
 */
export const SHELL_ORIGIN = (
  process.env.NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN
  ?? (process.env.NODE_ENV === 'development' ? '' : DEFAULT_SHELL_ORIGIN)
).replace(/\/$/, '')
export const SHELL_SCRIPT_SRC = `${SHELL_ORIGIN}/shell/v1.js`
export const SHELL_STYLESHEET_HREF = `${SHELL_ORIGIN}/shell/v1.css`
