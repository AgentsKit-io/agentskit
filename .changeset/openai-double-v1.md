---
"@agentskit/adapters": patch
---

Fix double `/v1` in the OpenAI-compatible endpoint URL. The request path was
always built as `${baseUrl}/v1/chat/completions`, but several adapters declare
their `baseUrl` already ending in `/v1` (openrouter `/api/v1`, together, mistral,
fireworks, huggingface, vllm, lmstudio, llamacpp), producing
`.../v1/v1/chat/completions` → HTTP 404 on every call. The base URL now has a
trailing `/v1` stripped before the path is appended, so both conventions resolve
correctly. (Latent because adapter tests mocked `fetch` without asserting the URL.)
