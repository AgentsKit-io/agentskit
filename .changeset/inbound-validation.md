---
"@agentskit/runtime": minor
---

Opt-in inbound event validation for chat triggers (ADR-0011). `createChatTrigger` accepts `eventSchema` (a JSON Schema) + `validateEvent` (an `ArgsValidator`, e.g. `createAjvValidator()` from `@agentskit/validation`). When both are set, a parsed `ChatSurfaceEvent` that fails the schema is rejected with HTTP 400 before the agent runs — defence in depth on top of `adapter.verify`. Default behaviour is unchanged and pulls in no new dependency.
