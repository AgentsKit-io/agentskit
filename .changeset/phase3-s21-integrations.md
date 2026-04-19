---
'@agentskit/tools': minor
---

Phase 3 sprint S21 — issues #169, #170, #171.

Ten provider integrations under the new `@agentskit/tools/integrations`
subpath. Each provider ships focused `defineTool` factories plus a
bundle helper returning all tools for that provider.

Dev + chat: `github` (search/create/comment issues), `linear`
(search/create issues), `slack` (postMessage/search), `notion`
(search/createPage), `discord` (postMessage).

Google Workspace: `gmail` (listMessages/sendEmail), `googleCalendar`
(listEvents/createEvent).

Business + storage: `stripe` (createCustomer/createPaymentIntent),
`postgres` (safe-mode query with allow-list + row cap + write gate),
`s3` (getObject/putObject/listObjects via BYO S3 client — works with
AWS SDK / MinIO / R2 without bundling them).

Shared `httpJson` helper and a custom `fetch` injection path on
every factory so tests can mock the network without patching
globals.

99 new tests.
