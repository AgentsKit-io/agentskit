# Ecosystem bar

`ecosystem-bar.js` is the shared top nav linking the four AgentsKit properties
(Framework · Playbook · Registry · AKOS). It is hosted here on the main site and
embedded by every property. Editing this one file updates the bar everywhere.

## Embed on the other properties

Add to each site's HTML (akos, playbook, registry repos):

```html
<script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="akos"></script>
```

Set `data-current` to one of: `framework` · `playbook` · `registry` · `akos`
(or omit it — the bar auto-detects by hostname). The current property is highlighted.

## Why no Subresource Integrity (SRI)

Intentional. The bar is first-party, served over HTTPS from our own origin, and
**mutable by design** — a central edit must propagate to all four sites. An SRI
hash would break on every update, defeating the single-source model (RFC 0002).
