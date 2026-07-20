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
**mutable by design** — a central edit must propagate to every site. An SRI
hash would break on every update, defeating the single-source model (RFC 0002).
