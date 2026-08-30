# Ecosystem bar

`ecosystem-bar.js` is the shared top nav linking the six public AgentsKit sites
(AgentsKit · Registry · Chat · Playbook · Doc Bridge · AKOS). Code Review remains
part of the seven-product manifest but is intentionally repository-native. The bar is hosted here on the main site and
embedded by every property. Editing this one file updates the bar everywhere.

The same artifact defines the interactive ecosystem showcase. Its product
identity, CTAs, and proof text are generated into the local
`SHOWCASE_PRODUCTS` snapshot from `ecosystem.json`, so the embedded artifact has
no runtime data dependency on a consuming site's network or API.

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
On mobile, the bar remains a single horizontal navigation row with its own
overflow and hidden scrollbar.

The script currently provides the shared top navigation and the interactive
ecosystem showcase. Product identity, public URLs, lifecycle stages, and CTAs
come from the generated `PROPS` and `SHOWCASE_PRODUCTS` snapshots. A footer is
owned by each consuming product and is not registered by this artifact.

## Why no Subresource Integrity (SRI)

Intentional. The bar is first-party, served over HTTPS from our own origin, and
**mutable by design** — a central edit must propagate to every site. An SRI
hash would break on every update, defeating the single-source model (RFC 0002).
