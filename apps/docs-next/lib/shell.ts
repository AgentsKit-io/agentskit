/**
 * Origin of the shared AgentsKit shell (/shell/v1.js + /shell/v1.css). This app hosts the
 * shell, so without an override it loads its own copy — the same files every sibling site
 * loads from https://www.agentskit.io.
 */
export const SHELL_ORIGIN = (process.env.NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN ?? '').replace(/\/$/, '')
export const SHELL_SCRIPT_SRC = `${SHELL_ORIGIN}/shell/v1.js`
export const SHELL_STYLESHEET_HREF = `${SHELL_ORIGIN}/shell/v1.css`
