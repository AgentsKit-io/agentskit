---
'@agentskit/templates': minor
---

feat(templates): embedder + browser-adapter scaffolds + conditional package.json deps.

Closes K/P2 #631 + #632 + #633.

Two new `ScaffoldType`s:

- `embedder` — emits an `EmbedFn` factory (OpenAI-compatible HTTP
  shape by default), pair with any vector memory backend.
- `browser-adapter` — emits an `AdapterFactory` skeleton matching
  the `webllm` shape (lazy `loadEngine`, OpenAI-style chunk
  iteration, `capabilities: { tools: false }`).

`generatePackageJson` now picks dependencies per scaffold type:

| Type | Adds (alongside `@agentskit/core`) |
|---|---|
| `tool` / `skill` | — |
| `adapter` / `embedder` / `browser-adapter` | `@agentskit/adapters` |
| `memory-vector` / `memory-chat` | `@agentskit/memory` |
| `flow` | `@agentskit/runtime` |

Templates package: 24 → 29 tests. lint clean. Both CI gates green.
