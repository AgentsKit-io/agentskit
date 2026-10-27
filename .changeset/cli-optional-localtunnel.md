---
'@agentskit/cli': patch
---

Make `localtunnel` an optional, lazily loaded peer dependency of `@agentskit/cli`. This removes the
vulnerable `axios` path (3 high advisories) from the published install tree. The `agentskit tunnel`
command now prints an install hint when `localtunnel` is missing; install it yourself
(`npm install -g localtunnel` or `pnpm add localtunnel`) to keep using the command.
