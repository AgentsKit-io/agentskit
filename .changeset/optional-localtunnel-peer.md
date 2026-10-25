---
'@agentskit/cli': minor
---

Make `localtunnel` an optional, lazily loaded peer dependency instead of a hard dependency. This removes the vulnerable `axios` path (3 high advisories) from the published install tree. The `tunnel` command now prints an install hint when `localtunnel` is missing; users who rely on it must run `npm install localtunnel` themselves.
