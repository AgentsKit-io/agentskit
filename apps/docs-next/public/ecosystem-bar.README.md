# Ecosystem bar

`ecosystem-bar.js` is the shared top nav linking the six public AgentsKit sites
(AgentsKit · Registry · Chat · Playbook · Doc Bridge · AKOS). Code Review remains
part of the seven-product manifest but is intentionally repository-native. The bar is hosted here on the main site and
embedded by every property. Editing this one file updates the bar everywhere.

The same artifact defines the interactive ecosystem showcase. Its numeric text
uses claim templates from `ecosystem.json`, a generated snapshot from
`ecosystem-claims.json`, and the cacheable `/ecosystem-claims.js` runtime artifact.
That artifact resolves AgentsKit values from `/api/stats.json` and Registry values
from `/r/index.json`, so consuming sites never maintain their own copies.

Product identity is available from `/api/ecosystem.json`. The endpoint exposes
only the six public products (`navigation.showInBar: true`), is CORS-enabled, and
uses a cacheable response with stale-while-revalidate. Consumers should use this
projection for names, URLs, accents, lifecycle stages, and shared CTAs instead of
copying those values into their own source trees. Keep the generated local
snapshot as the no-network fallback.

On the right side it also surfaces two community CTAs — **Star on GitHub**
(`github.com/AgentsKit-io/agentskit`) and **Discord** (`discord.gg/zx6z2p4jVb`).
These are project surfaces only; no personal-brand links belong in the bar. The
property links (left) are generated from `ecosystem.json`; the community links
are defined inline in the `build()` function.

## Embed on the other properties

Add to each product surface. Repository-native Code Review links to its GitHub home:

```html
<script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="akos"></script>
```

Set `data-current` to one of: `agentskit` · `registry` · `agentskit-chat` ·
`playbook` · `doc-bridge` · `code-review` · `akos`
(or omit it — the bar auto-detects by hostname). The current property is highlighted.
On mobile, the bar remains a single horizontal 44px-target navigation row and
automatically scrolls the current property into view when it loads.

## Semantic ecosystem footer

The same script registers `<agentskit-ecosystem-footer>`. The footer derives its
product identity and six-product navigation exclusively from the generated
`PROPS` snapshot. Code Review is not rendered because it is not a public web
property.

Each consumer supplies only its local tagline and links:

```html
<agentskit-ecosystem-footer
  data-current="agentskit-chat"
  tagline="One agent experience. Every surface."
>
  <a slot="local" href="/docs">Documentation</a>
  <a slot="local" href="/docs/cli">CLI</a>
  <a slot="resources" href="/llms.txt">llms.txt</a>
  <a slot="resources" href="https://github.com/AgentsKit-io/agentskit-chat">GitHub</a>
</agentskit-ecosystem-footer>
```

- `data-current` accepts one of the six public product IDs. It falls back to the
  script's `data-current`, then hostname detection.
- `tagline` supplies plain fallback text. Rich but accessible local markup may
  instead use the `tagline` slot.
- `local` and `resources` accept links owned by the consuming product. Empty
  groups are not displayed.
- The component uses a semantic `<footer>`, labelled navigation regions,
  keyboard-visible focus, responsive layouts, and light/dark system colors.

## Why no Subresource Integrity (SRI)

Intentional. The bar is first-party, served over HTTPS from our own origin, and
**mutable by design** — a central edit must propagate to every site. An SRI
hash would break on every update, defeating the single-source model (RFC 0002).
