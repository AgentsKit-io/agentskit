# ADR 0034 — Ecosystem shell v1

- **Status**: Accepted
- **Date**: 2026-09-25
- **Related ADRs**: ADR 0021, ADR 0029, ADR 0033

## Context

ADR 0029 chose a hosted, zero-dependency web shell over a framework package.
Until now only the ecosystem bar and the interactive tour were shared, through
`/ecosystem-bar.js`. Each site still carried its own footer, cursor or aurora
background, wordmark, and heading font, so the seven sites drifted. ADR 0033
aligned Registry with AgentsKit by copying components between the two apps,
which does not reach the sibling repositories.

Fumadocs owns search, the mobile menu, the theme toggle, and the sidebar on
most of the sites. Injecting a replacement product header would fight those
behaviours.

## Decision

The AgentsKit site (`apps/docs-next`) hosts a versioned shell:

| Asset | Content |
|---|---|
| `/shell/v1.js` | Auto-injected ecosystem bar, `<agentskit-ecosystem>` tour, `<agentskit-footer>`, `<agentskit-aurora>`. |
| `/shell/v1.css` | Zero-specificity `--ak-*` tokens (including `--ak-graphite`), font stacks, `.ak-product-wordmark`, footer fallback and local-column styles, aurora layer. |
| `/ecosystem-bar.js` | Legacy alias, byte-identical to `/shell/v1.js`. |

1. **Order and membership.** The bar and tour list six products in manifest
   order: AgentsKit, Registry, Chat, Doc Bridge, Code Review, Harness. Playbook
   is not listed. A site loaded with `data-current="playbook"` highlights
   nothing and its Star action targets `AgentsKit-io/agents-playbook`, resolved
   from a generated catalog of every manifest product.
2. **Star.** The GitHub Star action exists only in the bar and targets
   `data-current-repo`, falling back to the current product's repository.
   Product headers do not carry GitHub or Star links.
3. **Footer.** `<agentskit-footer current repo description license>` renders
   its upgraded content in a shadow root, so server-rendered children are never
   mutated and framework hydration is unaffected. `license` defaults to
   `MIT License`. Children are the fallback: an `ak-footer-fallback` element
   with plain ecosystem, repository, and license links that crawlers and no-JS
   readers see (kept in the DOM, not displayed after upgrade), plus an optional
   `slot="local"` element (`ak-footer-local`, with `ak-footer-col` columns)
   that is projected into the upgraded footer as product-owned navigation. The
   footer fades in over the page instead of drawing a hard top edge.
4. **Aurora.** `<agentskit-aurora>` is a fixed, `aria-hidden`,
   non-interactive WebGL layer behind content, with an animated CSS fallback.
   It reads the product's `--ak-accent`, paints over the page's `--ak-bg`, and
   chooses light or dark from that background, then from a `dark`/`light`
   class or `data-theme` on `<html>`, then from `prefers-color-scheme`. It
   renders one still frame when `prefers-reduced-motion` is set. A grid mesh
   taken from the Playbook home (64px, 1px `--ak-fg` lines at 4% alpha, layer
   opacity 0.4) is on by default and opted out with `grid="off"`; it scrolls
   with the page and fades out 480px before the document ends.
5. **Surface override.** A region that is dark or light by design declares
   `data-ak-surface="dark|light"` on `<body>` or a descendant (first match
   wins). The bar, tour, footer, and aurora then use that palette instead of
   the page theme, and revert when the attribute disappears (observed for
   client navigation). The shell applies it through one style element in
   `<head>`, not by editing page markup.
6. **Product header.** Each site keeps its Fumadocs layout and renders the
   `.ak-product-wordmark` markup as `nav.title`; styling comes from the shell
   stylesheet. Heroes stay product-owned.
7. **Distribution.** `scripts/sync-ecosystem.mjs` generates the bar, tour, and
   catalog blocks from `ecosystem.json`, writes the alias, and copies the
   shell into `apps/registry/public/shell/` as a fallback for development and
   origin outages. `/shell/*` is served with
   `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` and
   `Access-Control-Allow-Origin: *`.
8. **Loading.** Because the shell only writes into shadow roots and inserts
   the bar as a new first child of `<body>`, it can load with `defer` at the
   end of `<body>` (recommended) or after hydration (`next/script`
   `afterInteractive`). Consumers render `aria-hidden="true"` on the aurora
   themselves.
9. **Performance.** v1.css has no `@import` and never blocks rendering on a
   third party. v1.js adds Inter and Space Grotesk from Google Fonts
   asynchronously (preconnect, `media="print"` swapped on load,
   `display=swap`) only for families the page does not already provide;
   `data-ak-fonts="self"` on the script tag opts out for self-hosted fonts.
   Only the bar runs on the critical path; the tour, footer, and aurora
   upgrade in `requestIdleCallback` (2 s timeout) behind their fallbacks, and
   v1.css reserves the bar's height (57px, 53px under 768px) with a
   `body::before` placeholder so mounting it causes no layout shift. The
   aurora paints its CSS layer at once and compiles the WebGL shader when
   idle after `load`, but only on a hardware GPU: contexts that report
   `failIfMajorPerformanceCaveat` or a software renderer (SwiftShader,
   llvmpipe, softpipe, Microsoft Basic Render) keep a still CSS layer. The shader
   renders at half the device pixel ratio, at most 30 fps, and pauses in
   hidden tabs, off screen, and under reduced motion. The grid reads the
   document height only on resize. Shell text colours come from theme-aware tokens
   (`--ak-graphite`, `--ak-muted`) so they meet WCAG AA on light, dark, and
   `data-ak-surface` pages.
10. **Versioning.** Compatible changes ship inside v1 and reach every site within
    the one-hour cache window. Breaking changes ship as `/shell/v2.*`; consumers migrate
    on their own schedule.

Consumers read `NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN`, defaulting to
`https://www.agentskit.io`. The AgentsKit site loads its own copy.

This supersedes the component-copy approach recorded in ADR 0033 for the
aurora and footer. The masthead slots and federated search proposed in
ADR 0029 remain out of scope.

## Consequences

### Positive

- One edit updates the bar, tour, footer, background, wordmark, and heading
  font on every site, whatever its framework.
- Links remain in server HTML without a shared React package.
- Sites keep Fumadocs behaviour and their own heroes.

### Negative

- The AgentsKit deployment becomes shared first-party infrastructure; a
  broken v1 release affects every site until the cache window expires.
- The alias and fallback copies are generated files that must stay in sync;
  the contract tests and `sync-ecosystem --check` enforce this.
- Shadow-DOM styling means sites theme the footer only through `--ak-*`
  tokens and the `local` slot.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Copy footer and aurora components into every repository (ADR 0033 approach) | Recreates drift and excludes non-React consumers |
| Inject a full product header | Conflicts with Fumadocs search, mobile menu, and theme handling |
| Replace the footer's light DOM on upgrade | Mutates framework-owned markup and causes hydration mismatches |
| Publish an npm package | Requires coordinated dependency releases for visual fixes |
