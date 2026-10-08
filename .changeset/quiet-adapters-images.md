---
"@agentskit/adapters": minor
---

Serialize supported image/file parts in OpenAI-compatible, Anthropic, Gemini/Vertex and Ollama requests. Preserve text-only model behavior and older multimodal histories by falling back to text parts and short attachment markers, omitting binary data and data URLs, with at most one warning per request when multimodal capability is disabled; OpenAI and Anthropic assistant binary parts also use the text fallback. Unsupported modalities and sources still raise CAPABILITY_UNSUPPORTED when multimodal input is enabled. Explicit capabilities override the expanded model-name heuristic. Add configurable path, headers and fetch, optional Bearer authentication for compatible endpoints, OpenAI-compatible and Cloudflare REST presets, an OpenRouter alias, and explicit catalog URL variables. Existing text-only and default endpoint behavior is preserved.
