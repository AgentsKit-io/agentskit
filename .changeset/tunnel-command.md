---
'@agentskit/cli': minor
---

New `agentskit tunnel` command — open a public URL to a local port, perfect for receiving webhooks during development.

```bash
npx agentskit tunnel 4000                          # localhost:4000 → public URL
npx agentskit tunnel 8080 --subdomain my-app
npx agentskit tunnel 4000 --host 127.0.0.1
```

Powered by [`localtunnel`](https://localtunnel.me) — no account, no auth, free. The first request from a new visitor sometimes hits a `loca.lt` interstitial; that's a provider quirk.

Programmatic API:

```ts
import { startTunnel } from '@agentskit/cli'

const tunnel = await startTunnel({ port: 4000 })
console.log(tunnel.url)   // https://word-word-12345.loca.lt
// Later:
await tunnel.stop()
```

`open` is injectable so tests don't need a real network connection.
