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
