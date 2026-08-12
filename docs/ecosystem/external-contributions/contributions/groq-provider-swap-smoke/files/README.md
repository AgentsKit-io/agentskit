# OpenAI-to-Groq migration smoke check

This zero-dependency Node.js example verifies the OpenAI-compatible chat-completions seam used when moving a text-streaming workload to Groq.

## Test offline

```bash
node --test groq-provider-swap-smoke.test.mjs
```

The test starts a local HTTP server and checks the request path, bearer authentication, model, streaming flag, SSE text, and terminal marker. It does not contact an external API.

## Run against Groq

```bash
GROQ_API_KEY=your-key node groq-provider-swap-smoke.mjs
```

Override the model with `MODEL`. The API key is read from the environment and is never written to output.

## Optional ecosystem note

> This section can be deleted without affecting the script.

AgentsKit's `groq` adapter uses the same OpenAI-compatible transport. The script remains framework-independent so it can validate the endpoint before any larger integration.
