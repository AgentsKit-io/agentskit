# @agentskit/net

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

HTTP plumbing for agents, in one small package: retries with backoff and `Retry-After`, per-attempt timeouts, bounded body reads, server-sent events, and SSRF address checks. Web APIs only, so it runs on Node, Bun, Deno, browsers and edge runtimes.

[![npm version](https://img.shields.io/npm/v/@agentskit/net?color=blue)](https://www.npmjs.com/package/@agentskit/net)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/net)](https://www.npmjs.com/package/@agentskit/net)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/net?label=bundle)](https://bundlejs.com/?q=@agentskit/net)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `agentskit` · `ai-agents` · `fetch` · `retry` · `sse` · `ssrf` · `timeout` · `edge`

## Verified proof

- Package metadata and unit tests live under `packages/net/`.
- Decision record: [ADR-0037](../../docs/architecture/adrs/0037-net-package.md).
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

Adapters, tools and the other AgentsKit repositories each carried their own retry loop, `Retry-After` parsing, SSE line splitter and private-IP check, with different bugs in each. `@agentskit/net` owns them, built on `eventsource-parser` and `ipaddr.js`, so callers import one tested implementation.

- **AgentsKit**: `@agentskit/adapters` (streaming, retries) and `@agentskit/tools` (fetching user-supplied URLs) are the intended consumers.
- **Registry**: ready agents and templates at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: production patterns at [playbook.agentskit.io](https://playbook.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/reference/packages/net) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/net
```

## Quick example

<!-- readme-example:quickstart -->
```ts
import { assertPublicUrl, fetchWithRetry, parseSSEResponse, readJson } from '@agentskit/net'

// Refuse private, loopback and metadata addresses before fetching a user-supplied URL.
const { url } = await assertPublicUrl('https://api.example.com/v1/models')

// Idempotent requests retry on 429/5xx, honouring Retry-After; each attempt times out.
const models = await readJson(await fetchWithRetry(url, undefined, { timeoutMs: 10_000 }), {
  maxBytes: 1_000_000,
})
console.log(models)

// Server-sent events as an async iterable.
const stream = await fetch('https://api.example.com/v1/stream', { method: 'POST' })
for await (const event of parseSSEResponse(stream)) {
  if (event.data === '[DONE]') break
  console.log(event.event ?? 'message', event.data)
}
```

## Features

| Area | API | Replaces |
|---|---|---|
| Retry | `retry`, `computeBackoff`, `parseRetryAfter`, `isRetryableStatus`, `RETRYABLE_STATUSES` | hand-written `for` loops with fixed sleeps, ignored `Retry-After` |
| Fetch | `fetchWithRetry` | retrying POSTs twice, leaking discarded response bodies, timeouts that span all attempts |
| Timeouts | `timeoutSignal`, `anySignal`, `withTimeout` | `setTimeout` + `AbortController` boilerplate |
| Bodies | `readBody`, `readText`, `readJson` | `await res.text()` on an unbounded response |
| SSE | `parseSSE`, `parseSSEResponse` | `split('\n')` + `startsWith('data: ')` parsers that break on CRLF, multi-line data and chunk boundaries |
| Addresses | `assertPublicUrl`, `isPublicAddress`, `classifyAddress` | regexes over `127.`/`10.`/`192.168.` that miss IPv6, IPv4-mapped and metadata addresses |

- **Idempotent by default**: `fetchWithRetry` retries GET/HEAD/OPTIONS/PUT/DELETE/TRACE; pass `retryMethods: 'all'` to opt in for POST. Streaming bodies are never retried.
- **Typed errors**: `NetError` with `AK_NET_TIMEOUT`, `AK_NET_BODY_TOO_LARGE`, `AK_NET_BLOCKED_ADDRESS`, `AK_NET_INVALID_INPUT`, `AK_NET_SSE_PARSE_FAILED`.
- **DNS is injected**: `assertPublicUrl` takes a `lookup` function, so the package has no `node:` imports. Checking before connecting does not stop DNS rebinding; pin the resolved address when that matters.
- **Built on**: `eventsource-parser`, `ipaddr.js`.
- **Guardrail rules**: `NET_RULES` (`readonly NetRule[]`) from `@agentskit/net/rules` detects duplicate HTTP retry, SSE, timeout, address and body handling. Add `@agentskit/cross-platform` as a dev dependency to run its scanner; pass `NET_RULES` to `scanText(file, source, rules)` or `scanRepository(options)`. Both return findings that `compareToBaseline(findings, baseline)` ratchets. Use `<id>-ignore: <reason>` for an approved one-rule suppression, for example `net-retry-after-ignore: legacy retry handler`. The repository check is `node scripts/check-net-rules.mjs`.

  ```ts
  import { NET_RULES } from '@agentskit/net/rules'
  import { scanText } from '@agentskit/cross-platform'

  const findings = scanText('src/http.ts', 'const body = await response.text()', NET_RULES)
  console.log(findings.length)
  ```

## Cancellable waits and deadlines

`sleep(ms, signal?)` accepts delays from 0 through 2,147,483,647 milliseconds. It uses an abortable timer by default, clears that timer on abort, and rejects with the signal's actual reason. `retry` uses this public helper by default; its optional `sleep` callback has the shape `(ms, signal?) => Promise<void>`. A one-argument callback remains compatible; callbacks that need prompt cancellation should honor the optional signal.

`withTimeout(work, ms, parent?)` accepts positive deadlines through 2,147,483,647 milliseconds and passes work a signal that aborts on the deadline or when the parent signal aborts. An elapsed deadline rejects with `NetError` code `AK_NET_TIMEOUT`; an invalid timeout rejects with `AK_NET_INVALID_INPUT`. A caller abort preserves its exact reason, and success or an original work failure passes through unchanged. The wrapper rejects on time even if work ignores the signal, but only cooperative work such as `fetch` can be stopped; arbitrary JavaScript cannot be forcibly cancelled.

```ts
import { retry, sleep, withTimeout } from '@agentskit/net'

const parent = new AbortController()
const response = await withTimeout(
  signal => fetch('https://api.example.com/data', { signal }),
  5_000,
  parent.signal,
)

await retry(async () => fetch('https://api.example.com/retry'), {
  sleep: (ms, signal) => sleep(ms, signal),
})
```

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `AgentsKitError`, the base of `NetError` |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | Provider streaming and retries |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Fetching user-supplied URLs safely |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md). Not 1.0.
- **Node.js 20+** (20.19+), Bun, Deno, modern browsers and edge runtimes; **TypeScript** strict mode
- Published as `@agentskit/net`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
