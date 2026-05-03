---
"@agentskit/tools": minor
---

Add Microsoft Teams integration (`teams`, `teamsSendWebhook`, `teamsSendBot`, `adaptiveCard`, `messageCard`) under `@agentskit/tools/integrations`.

- Two outbound paths: Incoming Webhook (no app registration, plain fetch) and Bot Framework via injected `TeamsBotClient` adapter (botbuilder is not bundled — wrap your driver of choice). Mirrors the injection pattern used by `email` and `browser-agent`; auth modes (app secret, certificate, managed identity) live inside the adapter.
- `adaptiveCard()` builder produces v1.5 Adaptive Card payloads with title, body text, FactSet, and OpenUrl/Submit actions; `messageCard()` produces legacy O365 connector cards.
- Inbound activity routing (`message`, `mentioned`, etc.) is intentionally out of scope — long-running listeners belong in `@agentskit/triggers` (AgentsKitOS T-6).
- Closes #727. Downstream tracking AgentsKit-io/agentskit-os#166.
