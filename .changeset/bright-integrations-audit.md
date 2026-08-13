---
'@agentskit/integrations': minor
'@agentskit/tools': patch
---

Harden integration execution and compatibility surfaces: credential-bearing URLs are no longer
included in HTTP transport errors, idempotent retry policies honor `Retry-After`, caller
cancellation reaches raw transports, and Telegram/WhatsApp webhook events are normalized with
thread references. Gmail OAuth scopes, WhatsApp connection fields, malformed webhook handling,
and the legacy Slack webhook tool are now aligned with the canonical integration contract.
