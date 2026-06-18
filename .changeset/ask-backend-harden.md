---
---

Harden the central Ask backend's public surface (`apps/ask-backend`): per-IP rate-limit now covers the raw `/v1/search` + MCP `search_docs` paths (own bucket) and MCP `ask` (real caller IP, was a shared `unknown` bucket); spoof-resistant client IP (rightmost `x-forwarded-for` / `x-real-ip` instead of the caller-settable leftmost); 32 KB pre-parse body cap and 2000-char query cap. Internal app, no release.
