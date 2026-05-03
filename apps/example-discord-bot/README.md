# @agentskit/example-discord-bot

Reference Discord bot wrapping `createChatTrigger` from `@agentskit/runtime`. Closes [#780](https://github.com/AgentsKit-io/agentskit/issues/780).

Driver-light: uses Discord's Interactions HTTP endpoint (no gateway, no discord.js). Verifies inbound interactions with the application's Ed25519 public key. For richer setups (presence, voice, gateway events, voice mode hand-off to TTS/STT), wrap discord.js — this adapter covers the slash-command + message-component path.

## Setup

1. Create a Discord application at https://discord.com/developers/applications.
2. In **General Information**, copy the **Public Key**.
3. In **Bot**, generate a token, copy it.
4. In **Interactions Endpoint URL**, set `https://<your-host>/discord/interactions`. Discord PINGs the URL during validation; `src/index.ts` PONGs before the trigger sees the request.

```bash
export DISCORD_BOT_TOKEN=...
export DISCORD_PUBLIC_KEY=<hex>
pnpm --filter @agentskit/example-discord-bot dev
```

## What it normalizes

| Discord interaction | Normalized type |
|---|---|
| Type 1 (PING) | `null` |
| Type 2 (APPLICATION_COMMAND) | `mention` with `command` field + serialized options |
| Type 3 (MESSAGE_COMPONENT) | `mention` with serialized data |
| anything else | `null` (200 ignored) |

## Security

- Ed25519 signature verified via `webcrypto.subtle` against the application's hex public key.
- Bot-on-bot loops filtered via `user.isBot` in the trigger config.
- Replay protection beyond signature is the deployer's responsibility — interactions carry a unique `id`; dedup against `@agentskit/memory` if you need stronger replay defense than Discord's natural at-most-once delivery.
