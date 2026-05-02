---
---

chore(ci): add link-check workflow (lychee).

Closes M/P2 of the enterprise-readiness audit (#562). New
`.github/workflows/link-check.yml` runs `lycheeverse/lychee-action@v2`
on every PR (and push to main) that touches the docs tree or the
top-level `*.md` files. Caches results for 7 days.

`.lycheeignore` skips localhost, well-known placeholder hosts, and
typedoc-generated `/docs/api/*` paths (those are built at site-build
time, not committed).
