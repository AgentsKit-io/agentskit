import type { Highlighter } from 'shiki'

/**
 * Lazy singleton shiki highlighter for the Ask-the-docs chat.
 *
 * Bundle / SSR strategy
 * ---------------------
 * - shiki is dynamically `import()`ed only on first use, so it never enters the
 *   server bundle and is code-split out of the initial client chunk. The chat
 *   widget is interactive-only, so paying the highlighter cost lazily (after the
 *   user opens the panel) keeps the docs' first load untouched.
 * - We load a *bounded* set of themes (github-dark + github-light) and a small,
 *   common language set rather than shiki's full bundle. This is the single
 *   biggest lever on shiki's footprint.
 * - Dual-theme output: `codeToHtml` is called with `themes: { light, dark }`,
 *   which emits inline `--shiki-light` / `--shiki-dark` CSS variables on each
 *   span. `app/global.css` already resolves those vars per `.dark`, so theme
 *   switching is pure CSS — no re-highlight, no second highlighter instance.
 *
 * The promise is memoised so concurrent callers share one `createHighlighter`.
 */

export const SHIKI_THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const

/**
 * Common languages for chat answers. Kept intentionally small — every language
 * grammar adds to the lazily-loaded shiki chunk. `text` is shiki's built-in
 * plain fallback (no grammar) used when a fence has an unknown/empty lang.
 */
export const SHIKI_LANGS = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'bash',
  'markdown',
] as const

/** Aliases callers may pass that shiki indexes under a canonical name. */
const LANG_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  shell: 'bash',
  sh: 'bash',
  md: 'markdown',
  text: 'text',
  plaintext: 'text',
  txt: 'text',
}

let highlighterPromise: Promise<Highlighter> | null = null

/** Resolve a user-supplied lang to one we actually loaded; fall back to `text`. */
function resolveLang(lang: string | undefined): string {
  if (!lang) return 'text'
  const normalized = lang.toLowerCase().trim()
  const aliased = LANG_ALIASES[normalized] ?? normalized
  if (aliased === 'text') return 'text'
  return (SHIKI_LANGS as readonly string[]).includes(aliased) ? aliased : 'text'
}

/**
 * Get (or lazily create) the shared highlighter. Safe to call on the server —
 * it will create an instance there too, but callers should prefer to only
 * invoke `highlight` from client code (see SSR guards in the components).
 */
export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
        langs: [...SHIKI_LANGS],
      }),
    )
  }
  return highlighterPromise
}

/**
 * Highlight `code` as `lang`, returning a dual-theme `<pre>…</pre>` HTML string
 * (light/dark resolved by CSS vars). Unknown languages degrade to plain `text`.
 *
 * XSS safety
 * ----------
 * The `code` here is untrusted (LLM-generated chat answers). It is rendered via
 * `dangerouslySetInnerHTML` in `CodeBlock`, so the safety boundary lives here:
 * shiki's `codeToHtml` escapes the source into text nodes — it never interprets
 * the input as markup and only emits a fixed `<pre>/<code>/<span style|color>`
 * tree. We do not pass user-controlled themes or transformers, so no untrusted
 * string reaches the output as HTML. This makes the returned string safe to
 * inject without an extra sanitizer pass. If transformers are ever added, that
 * assumption must be re-checked (or the output run through a sanitizer).
 */
export async function highlight(code: string, lang?: string): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang: resolveLang(lang),
    themes: SHIKI_THEMES,
    // We only color the foreground; `global.css` forces span backgrounds to
    // transparent so the card surface reads as one flat block.
    defaultColor: false,
  })
}
