# ask-backend

Profile: <code>public-app</code>

## Verified proof

- App package lives at `apps/ask-backend`.
- Root claims: [ecosystem-claims.json](../../ecosystem-claims.json)

## Install / run

<!-- readme-command:install -->
```bash
pnpm --filter ./apps/ask-backend build
```

## Quick start

<!-- readme-example:quickstart -->
```bash
pnpm --filter ./apps/ask-backend build
```

## Maturity and compatibility

- Private monorepo app surface; ships with AgentsKit docs/product properties.
- **Node.js 20+** and **TypeScript**

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and [LICENSE](../../LICENSE).

## Ecosystem

- [AgentsKit](https://www.agentskit.io)
- [Registry](https://registry.agentskit.io)
- [Playbook](https://playbook.agentskit.io)
- [AKOS](https://akos.agentskit.io)

**Tags:** `agentskit` · `typescript`

# @agentskit/ask-backend

Profile: <code>public-app</code>

Central, **persistent** Ask backend (RFC-0007). A long-lived Hono server that loads
the ONNX embedder + each corpus index **once at boot** and stays warm — no
serverless cold-start, no native-binary tracing hacks — serving grounded, cited chat
for every AgentsKit property over HTTP.

One embedder + one $0 LLM pool + the shared guards serve **N corpora**, routed by a
`corpus` query param. Current corpora: `docs`, `registry`, `playbook`, `doc-bridge`, `akos`.

## API

```
POST /v1/ask?corpus=docs     { messages }       → NDJSON UiEvent stream (grounded, cited)
POST /v1/ask?corpus=akos     { messages }       → same protocol, AKOS sales persona
POST /v1/search?corpus=docs  { query, k? }      → { results: [...] }   (raw retrieval, no LLM)
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
  embedder) via relative imports — **no shared lib** (RFC-0007 D5). The backend now
  owns the ask handler and the docs app re-exports it while sites migrate.
- Cache is enabled by default. Exact answers + retrieval results are kept in-process
  and mirrored to Redis when `REDIS_URL` is set (Railway Redis volume/service).
  Upstash REST (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) remains a
  fallback. Answer entries are admitted only when they contain one terminal `done`
  event and no error; incomplete persisted entries are bypassed and replaced after
  successful regeneration. Semantic answer cache is in-process and uses the shared embedder.
  Disable with `ASK_CACHE_ENABLED=0`.
- `docs` uses the committed vector index. `registry`, `playbook`, and `akos` load
  configurable remote `llms-full.txt` / `llms.txt` sources and rank them with BM25;
  this is intentionally fast and cache-friendly until those repos publish dedicated
  vector indexes.
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

The Railway config lives at the **repo root** (`/railway.json`), NOT in this app dir.
This is deliberate: Railway reads its config from the service's Root Directory and
uses that same directory as the Docker **build context**. The backend imports the docs
app's source + the committed index, so it needs the **whole workspace** as context (and
the root `pnpm-lock.yaml` + `packageManager` field). With the config at the root and
**Root Directory left at the repo root (default)**, the build context is the full
monorepo. The root config's `dockerfilePath` points at `apps/ask-backend/Dockerfile`.

> If the config is put inside `apps/ask-backend/` and Root Directory is set there,
> the context shrinks to that subdir → `ERR_PNPM_NO_LOCKFILE` (no lockfile, no
> workspace, wrong pnpm version). Keep the config at the root.

In the Railway dashboard:

1. **New project → Deploy from GitHub repo** (`AgentsKit-io/agentskit`).
2. **Settings → Root Directory** = **leave empty / repo root** (do NOT set it to
   `apps/ask-backend`). Railway picks up `/railway.json` → Dockerfile builder.
3. **Variables**: `OPENROUTER_API_KEY` (required), `REDIS_URL` from the Railway
   Redis service/volume for durable cache + durable rate-limit (`ASK_REDIS_URL`
   is also accepted by the rate limiter; use `?family=0` for Railway private
   networking when needed), optional `UPSTASH_REDIS_REST_URL` +
   `UPSTASH_REDIS_REST_TOKEN` fallback, `ASK_CORS_ORIGINS`.
4. **Networking → Custom Domain** = `ask.agentskit.io`.

The Dockerfile installs the workspace + builds the backend's lib closure; start =
`pnpm --filter @agentskit/ask-backend start` (tsx). The persistent process means the
model loads once at boot and stays warm — the writable Railway filesystem caches it
(no `/tmp` hack needed; the Vercel-specific cache override doesn't fire here).

Then point each site's chat widget at `https://ask.agentskit.io/v1/ask?corpus=<id>`.

## Runtime configuration

Cache:

- `ASK_CACHE_ENABLED=0` disables answer/retrieval cache.
- `REDIS_URL` enables the Railway Redis-backed durable exact/retrieval cache.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are used only when
  `REDIS_URL` is absent.
- `ASK_CACHE_NAMESPACE=ask:v1` scopes keys; bump for global invalidation.
- `ASK_ANSWER_CACHE_TTL_MS` defaults to 30 days.
- `ASK_RETRIEVAL_CACHE_TTL_MS` defaults to 7 days.
- `ASK_SEMANTIC_CACHE_THRESHOLD` defaults to `0.86`.
- `ASK_PROMPT_VERSION=v1` is included in cache keys; bump when prompts materially change.

Remote corpus sources:

- `ASK_REGISTRY_LLMS_FULL_URL`, `ASK_REGISTRY_LLMS_URL`, `ASK_REGISTRY_INDEX_URL`
- `ASK_PLAYBOOK_LLMS_FULL_URL`, `ASK_PLAYBOOK_LLMS_URL`
- `ASK_DOC_BRIDGE_LLMS_FULL_URL`, `ASK_DOC_BRIDGE_LLMS_URL`
- `ASK_AKOS_LLMS_FULL_URL`, `ASK_AKOS_LLMS_URL` (`AKOS_*` aliases are also accepted)

AKOS funnel:

- `AKOS_WAITLIST_URL` defaults to `https://www.agentskit.io/#waitlist`.
- `AKOS_CTA_LABEL` defaults to `Join the AKOS waitlist`.
