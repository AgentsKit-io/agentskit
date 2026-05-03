---
"@agentskit/tools": minor
---

Add provider-agnostic email integration (`email`, `emailSend`, `emailFetch`) under `@agentskit/tools/integrations`.

- Drivers (nodemailer, imapflow, mailparser) are not bundled — pass `EmailTransport` and `ImapClient` adapters from your provider of choice (Outlook, Fastmail, AWS SES, Postfix, ProtonMail bridge, etc.). Mirrors the injection pattern used by `postgres` and `browser-agent`.
- `email_send` is destructive (`requiresConfirmation: true`), supports text/html bodies, multiple recipients, cc/bcc, and attachments.
- `email_fetch` returns recent IMAP messages matching an optional filter (mailbox, unseenOnly, since, from, subject) with `maxFetch` cap and truncation flag.
- Closes #726. Unblocks AgentsKitOS T-4 email trigger (downstream tracking AgentsKit-io/agentskit-os#165).
