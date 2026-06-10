---
"@agentskit/cli": patch
---

`agentskit add` now fetches the prebuilt registry index from the committed
`public/r` in the registry repo (served via raw GitHub / CDN) instead of a
separate `registry.agentskit.io` host — no separate deploy required. Falls back
to walking the agent source as before.
