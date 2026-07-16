# Ecosystem bar

`ecosystem-bar.js` is the shared top nav linking the seven AgentsKit products
(AgentsKit · Registry · Chat · Playbook · Doc Bridge · Code Review · AKOS). It is hosted here on the main site and
embedded by every property. Editing this one file updates the bar everywhere.

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

## Why no Subresource Integrity (SRI)

Intentional. The bar is first-party, served over HTTPS from our own origin, and
**mutable by design** — a central edit must propagate to all four sites. An SRI
hash would break on every update, defeating the single-source model (RFC 0002).
