# AgentsKit shell v1

The shared chrome for every AgentsKit site is hosted here and loaded
cross-origin by each product (ADR 0034):

| URL | Content |
|---|---|
| `/shell/v1.js` | Ecosystem bar (auto-injected at the top of `<body>`), `<agentskit-ecosystem>` tour, `<agentskit-footer>`, `<agentskit-aurora>`. Zero dependencies. |
| `/shell/v1.css` | Shared `--ak-*` tokens (zero specificity, so a site's own tokens win), font stacks, `.ak-product-wordmark`, footer fallback and local-column styles, aurora layer. |
| `/ecosystem-bar.js` | Legacy alias. Byte-identical copy of `/shell/v1.js` for consumers that have not migrated. |

`/shell/*` and `/ecosystem-bar.js` are served with
`Cache-Control: public, max-age=3600, stale-while-revalidate=86400` and
`Access-Control-Allow-Origin: *`. Compatible changes ship inside v1; breaking
changes go to `/shell/v2.*`.

## Generated data

`scripts/sync-ecosystem.mjs` regenerates three blocks in `shell/v1.js` from
`ecosystem.json`: `PROPS` (the six bar products, in manifest order), the tour's
`SHOWCASE_PRODUCTS`, and `CATALOG` (every product, including ones hidden from
the bar, so names and Star targets resolve for them). It then writes the
alias and Registry's fallback copies (`apps/registry/public/shell/v1.*`,
`apps/registry/public/ecosystem-bar.js`). Edit `shell/v1.js` by hand only
outside the generated markers; `--check` fails on drift.

## Consumer integration

```html
<link rel="stylesheet" href="https://www.agentskit.io/shell/v1.css">
<script src="https://www.agentskit.io/shell/v1.js"
        data-current="registry"
        data-current-repo="AgentsKit-io/agentskit-registry" defer></script>
```

Product ids: `agentskit`, `registry`, `agentskit-chat`, `doc-bridge`,
`code-review`, `harness`, `playbook`. Without `data-current` the bar detects the
product from the hostname. `playbook` is not listed in the bar or tour, so
nothing is highlighted and the Star action targets `AgentsKit-io/agents-playbook`.
The Star action lives only in the bar and targets `data-current-repo`.

- **Tour:** `<agentskit-ecosystem current="registry" data-visual="agentskit-home">…fallback…</agentskit-ecosystem>`.
- **Footer:** `<agentskit-footer current="registry" repo="AgentsKit-io/agentskit-registry" description="…" license="MIT License">`.
  `license` defaults to `MIT License` (Playbook uses `MIT (code) · CC-BY-4.0 (docs)`).
  Children are the server-rendered fallback. An element with `slot="local"`
  (class `ak-footer-local`, columns `ak-footer-col` with an `ak-footer-col__title`
  heading) is projected into the upgraded footer as the product's own columns;
  everything else stays in the DOM for crawlers and no-JS readers but is not
  displayed once the footer upgrades (shadow DOM, so hydration is untouched).
- **Aurora:** `<agentskit-aurora aria-hidden="true"></agentskit-aurora>` once per page. Fixed,
  `aria-hidden`, `pointer-events: none`, behind content; reads `--ak-accent`
  (or an `accent="#rrggbb"` attribute; `grid="off"` disables the mesh), and paints over the page's own `--ak-bg`.
  Its light or dark mode follows that background's luminance, falling back to
  a `dark`/`light` class or `data-theme` on `<html>`, then
  `prefers-color-scheme`; it re-syncs on theme and system changes. It renders a
  single still frame under `prefers-reduced-motion`. It also draws the
  Playbook grid mesh (64px squares, 1px lines in `--ak-fg` at 4% alpha, layer
  opacity 0.4) on by default; `grid="off"` removes it. The grid scrolls with the
  page and fades out over the last 480px of the document, and follows the theme
  and `data-ak-surface` through `--ak-fg`. Place it inside an
  `isolation: isolate` wrapper so it paints above that wrapper's background.
- **Fumadocs nav title:** `<span class="ak-product-wordmark"><span class="ak-product-wordmark__brand">AgentsKit</span> <span class="ak-product-wordmark__product">Registry</span></span>`.

## Fonts and performance

`v1.css` has no `@import`, so it never blocks rendering on Google Fonts. The
script loads Inter and Space Grotesk asynchronously (preconnect,
`media="print"` swapped to `all` on load, `display=swap`) and only for families
the page does not already provide. Sites that self-host the fonts (for example
with `next/font`) add `data-ak-fonts="self"` to the script tag to skip the check:

```html
<script src="https://www.agentskit.io/shell/v1.js" data-current="doc-bridge"
        data-current-repo="AgentsKit-io/doc-bridge" data-ak-fonts="self" defer></script>
```

Until a font arrives, the `--ak-font-*` stacks fall back to system UI fonts.

Only the bar is mounted on the critical path. `v1.css` reserves its height with
a `body::before` placeholder (57px, 53px under 768px) that disappears once
`#ak-eco` exists, so the bar causes no layout shift; sites should not use
`body::before` themselves. The tour, footer, and aurora upgrade when the main
thread is idle. The aurora shows its CSS layer immediately and switches to
WebGL only on a hardware GPU (software renderers such as SwiftShader or
llvmpipe keep a still CSS layer), rendering at half the device pixel ratio, at most
30 fps, and only while visible.

## Surface override (`data-ak-surface`)

A page that is dark (or light) by design regardless of the site theme, such as
the Harness and Code Review homes, declares it with
`data-ak-surface="dark"` or `data-ak-surface="light"` on `<body>` or on any
element inside it (the first match wins; other values are ignored). While one
is present, the bar, tour, footer, and aurora use that surface's `--ak-*`
palette instead of the page theme; product accents are unchanged. The shell
re-checks on DOM changes, so adding or removing the attribute during
client-side navigation switches back and forth. It writes a single
`<style id="ak-shell-surface">` in `<head>` and never touches the page's own
markup.

```tsx
<main data-ak-surface="dark" className="home">…</main>
```

## Loading and hydration

The shell never adds attributes or children to server-rendered elements: the
tour, footer, and aurora render into shadow roots, and the bar is a new first
child of `<body>`. It is therefore safe with either loading method:

```html
<!-- Recommended: end of <body>, deferred -->
<script src="https://www.agentskit.io/shell/v1.js" data-current="agentskit-chat"
        data-current-repo="AgentsKit-io/agentskit-chat" defer></script>
```

```tsx
// Also supported: after hydration (next/script)
<Script src={`${origin}/shell/v1.js`} strategy="afterInteractive"
        data-current="agentskit-chat" data-current-repo="AgentsKit-io/agentskit-chat" />
```

Render `aria-hidden="true"` on `<agentskit-aurora>` in server markup; the shell
adds it only when missing. Apps whose framework hydrates `<body>` itself and
rejects unknown nodes (React 18 roots on `document`) should use the
after-hydration form so the bar is inserted after hydration.

## Why no Subresource Integrity (SRI)

Intentional. The shell is first-party, served over HTTPS from our own origin,
and **mutable by design** — a compatible edit must propagate to every site. An
SRI hash would break on every update, defeating the single-source model
(RFC 0002).
