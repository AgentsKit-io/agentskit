const DEFAULT_SHELL_ORIGIN = 'https://www.agentskit.io'

/**
 * Origin of the shared AgentsKit shell (/shell/v1.js + /shell/v1.css), hosted by the
 * AgentsKit site. Registry keeps no local copy: set NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN
 * (for example http://localhost:3000 with docs-next running) to review shell changes.
 */
export const SHELL_ORIGIN = (process.env.NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN ?? DEFAULT_SHELL_ORIGIN).replace(/\/$/, '')
export const SHELL_SCRIPT_SRC = `${SHELL_ORIGIN}/shell/v1.js`
export const SHELL_STYLESHEET_HREF = `${SHELL_ORIGIN}/shell/v1.css`
