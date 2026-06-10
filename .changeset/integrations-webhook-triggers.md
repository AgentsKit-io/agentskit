---
'@agentskit/integrations': minor
---

Add inbound webhook **triggers** (signature `verify` + payload `normalize`) to the catalog for slack, github, linear, sentry, pagerduty, twilio, and discord — the open, dependency-light counterpart to the actions already in the catalog. Covers every signature scheme in the wild: HMAC-SHA256 over the raw body (github `sha256=`, linear/sentry bare hex), Slack's `v0:ts:body` with a 300s replay window, PagerDuty's multi-`v1=` list, Twilio's HMAC-SHA1 over URL+sorted-params, and Discord's Ed25519. Pure `node:crypto`, no extra deps. This lets any agent (not just the OS) authenticate inbound provider webhooks.
