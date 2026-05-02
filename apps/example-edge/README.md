# @agentskit/example-edge

AgentsKit running on Cloudflare Workers. Demonstrates the sub-50 KB
hot path documented at [`/docs/production/edge`](https://www.agentskit.io/docs/production/edge).

## What ships

- `src/worker.ts` — single-file Worker. One adapter, one
  `ReadableStream`. No runtime, no memory, no tools.
- `wrangler.jsonc` — Worker config with `nodejs_compat` enabled so
  `@agentskit/adapters` can use `fetch` + `AbortController` from
  the Workers runtime.

The bundle that actually runs per request is `openai()` plus the
streaming bridge — measured at well under the 50 KB target.

## Endpoints

| Path | Method | Body | Response |
|---|---|---|---|
| `/chat` | POST | `{ messages: [{ role, content }] }` | SSE: `data: <StreamChunk>` lines |
| `/health` | GET | — | `200 ok` |

Any other path returns `404 not found`.

## Deploy

```bash
# 1. Set the OpenAI key as a secret (never committed)
pnpm -w wrangler secret put OPENAI_API_KEY --name agentskit-example-edge

# 2. Optional: pick a different model
# Edit `vars.OPENAI_MODEL` in wrangler.jsonc, or set it via
# `wrangler secret put OPENAI_MODEL`.

# 3. Local dev
pnpm -w wrangler dev apps/example-edge/src/worker.ts \
  --config apps/example-edge/wrangler.jsonc

# 4. Deploy
pnpm -w wrangler deploy --config apps/example-edge/wrangler.jsonc
```

`wrangler` is not declared as a workspace dep — install globally
(`npm i -g wrangler`) or invoke via `npx wrangler …` to keep this
example dependency-light.

## Smoke test once deployed

```bash
curl -N -X POST https://agentskit-example-edge.<account>.workers.dev/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

Expect a stream of:

```
data: {"type":"text","content":"Hello"}

data: {"type":"text","content":"!"}

data: {"type":"done"}
```

## Related runtimes

The same `worker.ts` is portable with minor adjustments to:

- **Vercel Edge** — rename to `route.ts` under `app/api/chat/`, swap `export default { fetch }` for a named `POST` export.
- **Deno Deploy** — drop the `Env` interface, read `Deno.env.get('OPENAI_API_KEY')`.
- **Bun** — runs as-is via `Bun.serve({ fetch: handler.fetch })`.

See [`/docs/production/edge`](https://www.agentskit.io/docs/production/edge) for the per-runtime notes + the "what to skip on edge" table.

## Why no `@agentskit/runtime`?

Runtime carries the ReAct loop + delegation + memory glue — useful
on the server, dead weight on the edge. For "stream a model
response back to the user", the adapter alone is enough. Add tools
+ memory only when the agent actually needs them, and consider
making those calls in a longer-lived backend rather than in the
hot path.
