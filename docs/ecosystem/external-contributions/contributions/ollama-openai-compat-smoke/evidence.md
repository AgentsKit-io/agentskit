# Evidence — ollama-openai-compat-smoke

## Relationship

AgentsKit `@agentskit/adapters` can target OpenAI-compatible endpoints. Ollama documents `/v1/chat/completions`. A smoke script helps every consumer of that surface.

## Target rules

Follow upstream docs contribution norms: minimal examples, no secrets, no framework lock-in, clear local setup.

## Tests

- Offline mock server test in `files/openai-compat-smoke.test.mjs` (no Ollama required in CI)
- Optional live check when `OLLAMA_HOST` is reachable (documented, not required)

## Human approval

`APPROVAL.json` starts false. No upstream PR until HITL.
