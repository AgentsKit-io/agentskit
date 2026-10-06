---
"@agentskit/adapters": minor
---

Serialize supported image/file parts in OpenAI-compatible, Anthropic, Gemini/Vertex and Ollama requests. Reject unsupported modalities and sources with CAPABILITY_UNSUPPORTED instead of silently dropping attachments. Add configurable path, headers and fetch, optional Bearer authentication for compatible endpoints, OpenAI-compatible and Cloudflare REST presets, an OpenRouter alias, and explicit catalog URL variables. Existing text-only and default endpoint behavior is preserved.
