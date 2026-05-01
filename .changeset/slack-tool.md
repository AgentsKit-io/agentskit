---
'@agentskit/tools': minor
---

feat(tools): add `slackTool` — outbound-only built-in that posts to a Slack Incoming Webhook. Schema `{ text, channel?, username? }`; returns `{ ok, status }`. Complements the Bearer-token-based `slack()` integration.
