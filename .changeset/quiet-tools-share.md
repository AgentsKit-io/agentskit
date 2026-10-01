---
'@agentskit/tools': patch
---

Use `@agentskit/net` for SSRF address classification and bounded web-search response reads, blocking additional non-public address ranges. Public IPv4/host helpers retain legacy decimal handling for zero-padded dotted quads; `safeFetch` checks the canonical WHATWG URL host.
