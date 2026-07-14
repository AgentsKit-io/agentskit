# OpenAI-compatible local smoke check

Zero-dependency Node script that posts a single chat completion to an OpenAI-compatible HTTP API (Ollama’s `/v1` surface by default).

## Why it exists

Local model servers often claim OpenAI compatibility. This script proves the path your tools will use before you wire a larger stack.

## Run (live, optional)

```bash
# with Ollama running and a model pulled
node openai-compat-smoke.mjs
```

## Test (offline)

```bash
node --test openai-compat-smoke.test.mjs
```

## Optional: using with AgentsKit

> This section can be deleted without affecting the script.

If you already use AgentsKit adapters, point the OpenAI-compatible adapter at the same base URL. The smoke script itself does not import AgentsKit.
