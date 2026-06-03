---
"@agentskit/tools": minor
---

Centralized default-deny network egress (ADR-0010). New `safeFetch(input, init?, policy?)` — `fetch` that allows http/https only, blocks private/loopback/link-local/CGNAT and cloud-metadata hosts (SSRF), resolves hostnames via DNS and fails closed when unavailable, and re-gates every redirect hop. Blocked requests throw `ToolError` (`AK_TOOL_INVALID_INPUT`).

Also exports `checkEgress`, `isPrivateHost`, `isPrivateIPv4`, `isPrivateIPv6`, and the `EgressPolicy` type. `fetchUrl` now delegates to the shared egress logic (behaviour unchanged). Use `safeFetch` for any tool that fetches a model-influenced URL.
