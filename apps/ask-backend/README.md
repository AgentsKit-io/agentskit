# @agentskit/ask-backend

Central, **persistent** Ask backend (RFC-0007). A long-lived Hono server that loads
the ONNX embedder + each corpus index **once at boot** and stays warm — no
serverless cold-start, no native-binary tracing hacks — serving grounded, cited chat
for every AgentsKit property over HTTP.

One embedder + one $0 LLM pool + the shared guards serve **N corpora**, routed by a
`corpus` query param. F0 serves `docs`; F1 adds `registry`; F2 wires the cross-repo
corpora (akos/playbook).

## API

```
POST /v1/ask?corpus=docs    { messages }       → NDJSON UiEvent stream (grounded, cited)
POST /v1/search?corpus=docs { query, k? }      → { results: [...] }   (raw retrieval, no LLM)
GET  /v1/corpora                               → { corpora: [...] }
GET  /health                                   → ok
ALL  /mcp                                       → MCP server (JSON-RPC over POST)
```

### MCP

`/mcp` is a read-only [MCP](https://modelcontextprotocol.io) server (JSON-RPC 2.0
over POST, public `CORS *`) so agents query AgentsKit knowledge over the same corpus
registry — same transport as the registry MCP. Tools:

- `list_corpora()` → the knowledge bases this server answers over.
- `search_docs({ corpus?, query, k? })` → relevant chunks + source paths (raw retrieval).
- `ask({ corpus?, question })` → a grounded, cited answer (non-streaming; reuses the
  warm ask handler and collapses its `UiEvent` stream into one markdown answer + sources).

```bash
curl -s -XPOST http://localhost:8080/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ask","arguments":{"question":"what memory backends are there?"}}}'
```

## Run locally

```bash
OPENROUTER_API_KEY=... pnpm --filter @agentskit/ask-backend dev
# first request warms the model (~30 MB download to the local cache); then fast.
curl -s -XPOST 'http://localhost:8080/v1/ask?corpus=docs' \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"what memory backends are there?"}]}'
```

## Design

- Reuses the docs app's ask source directly (`createAskHandler`, retriever, guards,
  embedder) via relative imports — **no shared lib** (RFC-0007 D5). The logic will
  settle here permanently once the sites point their widgets at this backend (F4).
- `createAskHandler` (RFC-0006 D5) is framework-neutral `(Request) => Response`, so
  it mounts straight onto Hono.
- Protection (every public compute route): **per-IP rate-limit** (Upstash durable,
  in-memory fallback) — the costly `ask` path and the raw `search` path use separate
  buckets; **spoof-resistant client IP** (rightmost `x-forwarded-for` / `x-real-ip`,
  not the caller-settable leftmost); **body cap** (32 KB, pre-parse) + **query cap**
  (2000 chars); the triage/injection/scope guards before any model call. Secrets stay
  server-side.
- CORS: `/v1/*` is allow-listed to `*.agentskit.io` (+ localhost dev). `/mcp` is `*`
  — intentional: it is a public, read-only knowledge API with no auth/cookies, so
  open CORS leaks nothing a direct request wouldn't; abuse is bounded by the same
  rate-limit. (Same posture as the registry MCP.)

## Deploy (Railway)

`railway.json` is checked in. In the Railway dashboard:

1. **New project → Deploy from GitHub repo** (`AgentsKit-io/agentskit`).
2. **Settings → Root Directory** = the **repo root** (the backend imports the docs
   app's source + the committed index, so it needs the full workspace — not just
   `apps/ask-backend`). The `railway.json` build/start commands run from there.
3. **Variables**: `OPENROUTER_API_KEY` (required), optional `UPSTASH_REDIS_REST_URL`
   + `UPSTASH_REDIS_REST_TOKEN` (durable rate-limit), `ASK_CORS_ORIGINS`.
4. **Networking → Custom Domain** = `ask.agentskit.io`.

Build = `pnpm install`; start = `pnpm --filter @agentskit/ask-backend start` (tsx).
The persistent process means the model loads once at boot and stays warm — the
writable Railway filesystem caches it (no `/tmp` hack needed; the Vercel-specific
cache override doesn't fire here).

Then point each site's chat widget at `https://ask.agentskit.io/v1/ask?corpus=<id>`.
