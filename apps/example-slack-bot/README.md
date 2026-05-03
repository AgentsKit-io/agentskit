# @agentskit/example-slack-bot

Reference Slack bot wrapping `createChatTrigger` from `@agentskit/runtime`. Closes [#779](https://github.com/AgentsKit-io/agentskit/issues/779).

Driver-light: uses Slack's Events API webhook + `chat.postMessage` REST endpoint via `fetch`. No Bolt dependency. For production, swap the `reply` body to wrap Bolt's `app.client.chat.postMessage` so retries, rate-limit handling, and pagination come for free.

## Setup

1. Create a Slack app at https://api.slack.com/apps.
2. Enable **Event Subscriptions** with these bot events: `app_mention`, `message.channels`, `message.im`, `reaction_added` (optional), `file_shared` (optional).
3. Set the request URL to `https://<your-host>/slack/events`.
4. Install the app to a workspace; copy the **Bot User OAuth Token** (`xoxb-…`) and the **Signing Secret**.

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_SIGNING_SECRET=...
pnpm --filter @agentskit/example-slack-bot dev
```

URL-verification handshake is handled in `src/index.ts` before the trigger runs.

## What it normalizes

`src/adapter.ts` exposes a `slackAdapter()` that turns Slack Events API payloads into the unified `ChatSurfaceEvent` discriminated union from `@agentskit/runtime`:

| Slack inner event | Normalized type |
|---|---|
| `app_mention` | `mention` |
| `message` (in thread) | `reply` |
| `message` | `message` |
| `message` (subtype `file_share`) | `file_upload` |
| `reaction_added` / `reaction_removed` | `reaction` |
| anything else | `null` (200 ignored) |

## Security

- Slack signing secret + 300s timestamp window both enforced in `verify`. Replays older than that are rejected.
- Bot-on-bot loops filtered via `user.isBot` in the trigger config.
- Replay protection beyond the timestamp window (eventId dedup against memory) is the deployer's responsibility — wire `@agentskit/memory` and skip when `eventId` was seen before.
