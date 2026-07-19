---
'@agentskit/adapters': minor
---

Harden adapter contract and provider protocol behavior ahead of the future stable freeze. Streams now normalize transport, parser, truncation, and abort failures into exactly one terminal error chunk with `metadata.error`; native Anthropic and Gemini/Vertex tool histories preserve correlated and parallel results; Gemini keeps API keys out of URLs; Vercel UI message stream v1 is parsed natively; embedders reject invalid vectors; and WebLLM is declared as an optional peer.

Custom `createAdapter` parsers can use the additive request signal and response context. Consumers that previously relied on thrown stream failures or silently accepted incomplete provider streams should handle the contract's terminal `error` chunk instead.
