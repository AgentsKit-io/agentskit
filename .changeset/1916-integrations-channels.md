---
'@agentskit/integrations': minor
---

feat: conversation channels. A `Channel` interface; WhatsApp Cloud API, Telegram, Slack and email (Resend) adapters; `createChannelHandler` to bind a channel to an agent; `verifySvix` for Resend webhook signatures. Slack `url_verification` and WhatsApp GET `hub.challenge` handshakes are answered. Retries are deduped by message/event id, while failed deliveries stay retryable. Empty secrets are rejected (including `verifyTelegram` with an empty secret). The email body is fetched from Resend's Received Emails API.
