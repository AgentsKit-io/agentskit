---
name: reference_security-surfaces
description: where egress and inbound validation live, and the shared validation contract they reuse
metadata:
  type: reference
---

**Fact:** Two network trust boundaries are guarded, both opt-in and both reusing
the ADR-0008 `ArgsValidator` + JSON Schema contract (no second mechanism):

- **Outbound (SSRF) — ADR-0010.** `safeFetch` / `checkEgress` in
  `@agentskit/tools` (`src/safe-fetch.ts`). Default-deny: blocks
  private/loopback/link-local/CGNAT + cloud-metadata hosts, re-gates redirects,
  fails closed without DNS. `fetchUrl` delegates to it. Lives in tools (needs
  `node:dns`, would break browser/edge core; core is at its 10KB budget).
- **Inbound (webhook) — ADR-0011.** `createChatTrigger` in `@agentskit/runtime`
  takes opt-in `eventSchema` + `validateEvent`; off-schema events get HTTP 400
  before `agent.run`, on top of `adapter.verify` (sig/replay).

**How to apply:**
- New tool fetching a model-influenced URL → use `safeFetch`, never bare `fetch`.
- New inbound surface → set `eventSchema` + `validateEvent: createAjvValidator()`.
- Need egress for a non-tools package → promote `EgressPolicy` to core per
  ADR-0009 before duplicating.

**Related:** [[feedback_json-schema-canonical]], [[feedback_zero-dep-core]],
[[project_playbook-alignment]]. Threat model: `docs/security/threat-model.md`
(#6 egress, #8 inbound).
