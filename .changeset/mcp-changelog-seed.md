---
---

Internal: add the `@agentskit/mcp` package CHANGELOG.md seed so the changesets release action can generate GitHub releases (the repo uses `changelog: false`, so `changeset version` doesn't create one for a brand-new package). Mirrors every other package; unblocks the release/publish that was failing with ENOENT on `packages/mcp/CHANGELOG.md`.
