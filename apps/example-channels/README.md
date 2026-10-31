# @agentskit/example-channels

Connects a conversation channel (Telegram here; WhatsApp Cloud API, Slack and email via Resend work the same) to an AgentsKit runtime agent using `@agentskit/integrations` channels.

```bash
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_WEBHOOK_SECRET=...   # same value passed to setWebhook secret_token
pnpm --filter @agentskit/example-channels dev
```

Each webhook is signature-verified (401 on failure) before the agent runs; the answer is sent back on the same conversation.
