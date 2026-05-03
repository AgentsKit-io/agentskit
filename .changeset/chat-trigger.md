---
"@agentskit/runtime": minor
---

Add `createChatTrigger` — unified trigger contract for chat-surface bots (Slack, Teams, Discord, WhatsApp, …). Closes #782.

One trigger, six normalized event shapes, one observer hook, one HITL surface. Writing three divergent bot templates means three divergent test suites; this contract collapses them to one. Adapters are tiny — they wrap a provider SDK (Bolt, discord.js, Bot Framework) and turn raw events into a discriminated union of `ChatSurfaceEvent`s: `message`, `mention`, `reply`, `reaction`, `file_upload`, `installation`. Each event carries normalized `surface` / `channel` / `user` / `eventId` / optional `threadId` metadata.

`createChatTrigger({ adapter, agent, … })` returns a framework-agnostic `WebhookHandler` ready for Express / Hono / Next route handlers. Built-in:

- `verify` hook → 401 on bad signature
- `parse` returning `null` → 200 ignored (stops surface retries)
- `parse` throwing → 400 with the error
- agent throwing → 500 with the error
- `filter` for bot-on-bot loop guards or quiet-hours
- `autoReply` posts the agent's output back via `adapter.reply`, swallowing reply errors so the agent's run still counts as handled
- structured `onEvent` observer for received / skipped / handled / rejected / replied

Unblocks the Slack (#779), Discord (#780), and Teams (#781) bot templates — they now share one contract instead of diverging. Reference adapters wrapping Bolt / discord.js / Bot Framework live in those template PRs; this PR ships the contract + factory + tests only.
