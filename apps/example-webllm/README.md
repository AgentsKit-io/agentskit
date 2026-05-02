# @agentskit/example-webllm

Browser-only chat — the LLM runs **100% in your browser** via WebGPU
+ [`@mlc-ai/web-llm`](https://github.com/mlc-ai/web-llm). No API key,
no server-side inference, no telemetry.

Demonstrates the [`webllm`](https://www.agentskit.io/docs/data/providers/webllm)
adapter from `@agentskit/adapters` driving the standard
[`useChat`](https://www.agentskit.io/docs/for-agents/react) hook
from `@agentskit/react`.

## Run

```bash
pnpm --filter @agentskit/example-webllm dev
# open http://localhost:5173
```

First message kicks off model download + WASM compilation. The
status line reports progress (`32% — Fetching shard 5 of 12`).
Subsequent loads hit the browser cache.

## Requirements

- A browser with **WebGPU** enabled (Chrome 113+, Edge 113+, recent
  Safari Technology Preview, Firefox Nightly with `dom.webgpu.enabled`).
- ~4–8 GB free disk space for the model cache.
- A discrete GPU is much faster but not strictly required.

## What's running

```ts
import { useChat } from '@agentskit/react'
import { webllm } from '@agentskit/adapters'

const adapter = webllm({
  model: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
  onProgress: ({ progress, text }) => console.log(progress, text),
})

const chat = useChat({ adapter })
```

That's the entire integration. The adapter exposes the same
`AdapterFactory` surface as `openai`, `anthropic`, etc., so any
component you've already built against `useChat` works unchanged.

## What's not in scope

- Tool calling — the WebLLM engine does not expose a tool-use API
  in the OpenAI-compatible chat completion shape today. The
  `webllm` adapter therefore declares `capabilities: { tools: false }`.
  If you need tools in the browser, route through a small
  server-side adapter (`example-edge` shows how).
- Memory persistence — sessions live in the React state. Wire
  `localStorageMemory` from `@agentskit/core` if you want them to
  outlive a tab refresh.

## Troubleshooting

- **"WebGPU not available"** — your browser hasn't enabled it yet.
  Check `chrome://gpu` (Chrome / Edge) or your browser's WebGPU
  feature flag.
- **First message hangs at 0%** — the cross-origin isolation
  headers in `vite.config.ts` are required for some browsers.
  Verify the server returned `Cross-Origin-Opener-Policy: same-origin`
  in the network tab.
- **OOM on smaller GPUs** — try a smaller-quant model id like
  `Phi-3.5-mini-instruct-q4f16_1-MLC` (edit `MODEL_ID` in
  `src/App.tsx`).

## See also

- [Provider page · `webllm`](https://www.agentskit.io/docs/data/providers/webllm)
- [`/docs/production/edge`](https://www.agentskit.io/docs/production/edge) — server-side small-bundle counterpart.
- [`apps/example-react`](../example-react) — same `useChat` hook, server-side OpenAI.
