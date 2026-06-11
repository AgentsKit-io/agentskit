---
'@agentskit/integrations': minor
---

Add connect-form `configFields` to the `email` and `teams` catalog services.
`email` exposes flat SMTP fields (host/port/user/pass/secure/from) and `teams`
exposes a webhook URL. A host renders these as a connect form and maps the flat
values onto each service's runtime shape — an `EmailTransport` it builds (e.g.
via nodemailer) for `email_send`, and the nested `{ webhook: { webhookUrl } }`
for `teams_send_webhook`. The Teams *bot* client stays adapter-injected.
