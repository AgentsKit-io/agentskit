# Evidence — groq-provider-swap-smoke

## Relationship

Groq documents an OpenAI-compatible base URL, and AgentsKit's `groq` adapter sends chat-completions requests to that surface. The proposed script tests the shared protocol without importing an agent framework.

## Target rules

The Groq API Cookbook contribution guide was reviewed on 2026-08-12. It requests helpful, reusable, high-quality, accurate, executable, and product-neutral contributions.

## Tests

- Offline mock server verifies path, authorization, model, streaming request, SSE text, and terminal marker.
- Missing credentials fail before transport.
- The optional live command reads `GROQ_API_KEY` from the environment and never prints it.

## Human approval

`APPROVAL.json` starts false. No upstream issue, pull request, or message is authorized by this draft.
