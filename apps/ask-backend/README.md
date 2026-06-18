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
POST /v1/ask?corpus=docs   { messages }  → NDJSON UiEvent stream (grounded, cited)
GET  /v1/corpora                          → { corpora: [...] }
GET  /health                              → ok
```

(`/v1/search` + `/mcp` land in F1/F3.)

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
- Protection: CORS allow-list (`*.agentskit.io`), per-IP rate-limit (Upstash durable,
  in-memory fallback), the triage/injection/scope guards, body cap. Secrets stay
  server-side.

## Deploy

Railway (F1): persistent instance, `pnpm --filter @agentskit/ask-backend start`,
`/health` healthcheck, custom domain `ask.agentskit.io`. Config lands in F1.
