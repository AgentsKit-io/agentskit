# RFC 0007 — Central Ask backend (persistent, multi-corpus, public, MCP)

- **Status**: Proposed
- **Date**: 2026-06-18
- **Author**: @EmersonBraun
- **Related RFCs**: [0002](./0002-agent-registry-and-ecosystem-cohesion.md) (ecosystem cohesion), [0006](./0006-ui-component-registry.md) (the chat as a component; `createAskHandler` D5)
- **Related**: the live Ask-the-docs chat (`apps/docs-next/lib/ask/*`), the registry MCP (`apps/registry/app/api/mcp`)

## Summary

Move the AgentsKit AI/RAG workload off Vercel serverless into **one persistent
backend** (Railway) that serves **every property** — docs, AKOS, playbook, registry
— from a single warm process, plus a public **MCP** endpoint. One embedding model
+ one LLM pool + the existing guards are loaded **once at boot** and shared across
**N per-property corpora**, routed by a `corpus` parameter. The sites stay on
Vercel (static + CDN) and call the backend over HTTP; the backend is **public but
protected** (CORS + rate-limit + injection/scope guards; secrets server-side).

The framework-neutral `createAskHandler` (RFC-0006 D5) drops straight into this
backend unchanged — this is the "hosted" delivery the RFC anticipated.

## Motivation

The Ask-the-docs chat runs a local ONNX embedder + RAG in a Vercel serverless
function. That was the wrong substrate, and a production outage proved it:

- **Cold starts** reload the ~30 MB model and the 21 MB index per cold container →
  the first query after idle is slow; warm is fast but low traffic keeps it cold.
- **Native binaries** (`libonnxruntime.so.1`) aren't traced into the function by
  default — a real prod failure that needed bespoke `outputFileTracingIncludes`.
- **No persistent memory** — the model/index can't stay resident.
- **Duplication looms**: AKOS, playbook, and registry will each want the same chat
  + retrieval. Four serverless copies of a heavy embedder is wasteful and fragile.
- **MCP demand**: agents want to query AgentsKit knowledge programmatically; the
  registry already ships an `/api/mcp`. A central knowledge MCP is the natural home.

A **persistent process** fixes all of it: the model loads once and stays warm
(no cold start, no tracing hacks), serves all properties, and exposes MCP — for the
price of a small always-on instance.

## Resolved decisions (locked with the author)

### D1. Persistent backend on Railway, sites stay on Vercel

A long-lived Hono (Node) server on Railway. Sites remain on Vercel (static/CDN/edge
for docs); their chat widgets call the backend over HTTP. Not $0 — ~\$5/mo for a
small always-on instance — accepted for the reliability + speed win.

### D2. Multi-corpus from v1 (one model, N retrievers)

The backend loads **one** shared embedder (`bge-small-en-v1.5`, 384-d, ONNX native),
**one** LLM adapter (OpenRouter free pool + fallback), and the shared guards — then
serves **per-property corpora**, each a committed index + retriever:

```
corpora = { docs, akos, playbook, registry }   // extensible
```

Requests carry a `corpus`; the backend picks that corpus's retriever and runs the
shared handler. A new property = drop in its index + register the corpus. The model
is shared (same embedding space) — adding corpora is cheap.

### D3. Public but protected

The endpoint serves **public** docs knowledge → no end-user auth. Protected by:
- **CORS** allow-list (`*.agentskit.io` + localhost dev),
- **per-IP rate-limit** (Upstash durable; in-memory dev fallback),
- the existing **triage / injection / scope / sanitize** guards,
- **body-size cap**.
Secrets (`OPENROUTER_API_KEY`, `UPSTASH_*`) live server-side, never exposed. The MCP
endpoint is likewise public + read-only.

### D4. Custom domain + MCP early

Served at **`ask.agentskit.io`** (Railway custom domain) — positioned as a product
("AgentsKit knowledge API + MCP"), not an internal URL. The **MCP** endpoint ships
in the early phases, not deferred.

### D5. The backend **app** owns the logic — NO new shared lib

**`apps/ask-backend`** (a Hono app) is the single home of the ask engine —
`createAskHandler`, the guards, the per-corpus retrievers, the embedder, the
streaming protocol, the MCP tools. **No new `packages/*` lib is created.** The repo
already carries ~24 packages; a heavy shared lib is unwarranted here because the
sites **do not run the ask logic** — their widgets call the backend over HTTP, so
there is nothing heavy to share.

The only genuinely shared piece is the **wire protocol** (the widget renders the
`UiEvent`s the backend emits). It is small (event types + a few helpers + tool
names); it lives in the backend app and the docs widget imports it cross-app
(monorepo) — or keeps a tiny local copy. No package.

`createAskHandler` (RFC-0006 D5) is already framework-neutral, so it mounts into
Hono unchanged. **Migration order avoids breakage:** stand up the backend first
(it can reference `docs-next`'s ask source during dev), repoint the widgets, then
the logic settles permanently in `apps/ask-backend` and `docs-next`'s route is
removed — no duplication, no lib.

### D6. Indexes per-property, committed (for now)

Each property generates its index (`gen-ask-index` over its docs) and commits it; the
backend loads all corpora at boot. A real vector DB (LanceDB/pgvector) is a future
option (D-future) once corpora grow — out of scope here.

## HTTP + MCP contract

```
ask.agentskit.io
  POST /v1/ask        { corpus, messages }  → NDJSON/SSE stream of UiEvents (grounded, cited)
  POST /v1/search     { corpus, query, k? } → { results: RetrievedDocument[] }   (raw retrieval)
  GET  /v1/corpora                          → { corpora: [{ id, title, count }] }
  GET  /health                              → 200 ok (Railway healthcheck)
  ALL  /mcp                                 → MCP server (streamable-http/SSE)
```

**MCP tools** (read-only, over all corpora):
- `list_corpora()` → available knowledge bases.
- `search_docs({ corpus, query, k })` → relevant chunks + source paths.
- `ask({ corpus, question })` → a grounded, cited answer (non-streaming for MCP).

**Streaming**: `/v1/ask` keeps the current NDJSON `UiEvent` protocol; SSE is offered
via content negotiation (RFC-0006 D7) for clients that prefer it.

**`createAskHandler` reuse**: `/v1/ask` is `createAskHandler(askConfig(corpus))` —
the handler is already Web-standard `(Request) => Promise<Response>`, so Hono mounts
it as `app.post('/v1/ask', (c) => handler(c.req.raw))`. The corpus selects the
retriever; everything else (guards, adapter, citations) is shared config.

## Protection contract

- `security.corsOrigins` = `['https://www.agentskit.io', 'https://agentskit.io', 'https://akos.agentskit.io', 'https://playbook.agentskit.io', 'https://registry.agentskit.io', 'http://localhost:*']`.
- `rateLimiter` = Upstash sliding window per IP (durable across the single instance;
  trivially correct on one process, unlike serverless).
- Guards (triage/scope/injection/sanitize) run before any model/LLM call — cheap
  trivia + attacks never reach the model (and stay instant).
- `maxBodyBytes` cap; the LLM key never leaves the process.

## Phased rollout

- **F0 — scaffold `apps/ask-backend` (Hono)**: the app reuses `docs-next`'s ask
  source (`createAskHandler` + guards + retriever + embed) — referenced during dev,
  **no package extraction** — and serves `/v1/ask` + `/health` for the docs corpus.
  Run it locally; verify a real query streams a cited answer. `docs-next`'s Vercel
  route stays live (unchanged) the whole time.
- **F1 — Railway + multi-corpus**: load docs + akos + playbook + registry indexes
  (those that exist; others stubbed); `/v1/search`, `/v1/corpora`. Warm-load the
  model at boot. Deploy to Railway, attach `ask.agentskit.io`. Point the **www**
  widget at it; verify warm + fast + cited.
- **F2 — wire the other sites**: akos/playbook/registry widgets point at
  `ask.agentskit.io/v1/ask?corpus=<their>`; generate + commit their indexes.
- **F3 — MCP**: `/mcp` with `list_corpora` / `search_docs` / `ask`; document it for
  agents (and cross-link from the registry MCP).
- **F4 — retire serverless routes**: remove the per-property Vercel `/api/ask-docs`
  routes (or leave a thin proxy); the backend is the single source.

## Open questions

1. **Index freshness** — committed indexes go stale as docs change. Rebuild on each
   property's deploy (CI) and have the backend re-pull on boot / on a webhook? Or a
   shared vector DB later? (Lean: CI-built committed indexes per property for now;
   backend reloads on deploy.)
2. **Rate-limit store** — Upstash (needs the account) vs a small Redis on Railway.
   (Lean: Upstash, already wired in the current code.)
3. **MCP transport** — streamable-http vs SSE (or both). (Lean: streamable-http,
   SSE fallback.)
4. **Quality tier** — keep $0 OpenRouter free pool, or allow a BYO key per property
   for better answers? (Lean: free pool default; env-configurable per corpus.)
5. **Embedding for huge corpora** — local ONNX scales fine on a warm box for now;
   revisit a hosted/api embedder only if a corpus outgrows memory.

## Tradeoffs / alternatives

- **Deploy each `docs-next` to Railway instead of extracting** — rejected: builds the
  whole site per property, diverges from Vercel, no sharing, no central MCP.
- **Stay on Vercel + bundle the model** — rejected as the target (keeps cold-start
  init; the warm-process win is the whole point) — but remains the fallback if Railway
  is unavailable.
- **Cost** — ~\$5/mo vs \$0 serverless. Accepted: reliability + speed + one backend
  for four properties + MCP is worth it.

## Rollout gate

F0 must prove the live docs chat is byte-for-byte unaffected (same answers) before
F1. Each phase is independently revertible (the Vercel route stays until F4).
