# Utility-first check — ollama-openai-compat-smoke

## Contribution in one sentence

Ship a zero-dependency Node script that validates OpenAI-compatible chat streaming against a local server (Ollama by default).

## Strip-test

Remove the optional “Using with AgentsKit” section from the contribution README.

| Still works | Gone |
|---|---|
| `openai-compat-smoke.mjs` against `http://127.0.0.1:11434/v1` | AgentsKit adapter mention |
| Offline unit test with a mock server | Ecosystem CTAs |
| Clear failure when the server is down | Brand links |

**Verdict:** standalone utility. Promo copy is optional and removable.
