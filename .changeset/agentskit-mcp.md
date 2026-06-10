---
"@agentskit/mcp": minor
---

New package `@agentskit/mcp` — expose AgentsKit tools AND whole agents to any MCP
host (Claude Desktop, Cursor, Windsurf).

- `npx @agentskit/mcp --tools fetch,search` — primitive tools over stdio.
- `npx @agentskit/mcp --agents <ids> --provider <p>` — expose registry agents as
  tools; each runs server-side. Provider covers first-class (openai/anthropic/
  gemini/ollama) + OpenAI-compatible (deepseek/grok/groq/mistral/cohere/together/
  fireworks/openrouter/cerebras/kimi/huggingface/qwen/lmstudio/vllm/llamacpp) +
  any models.dev-catalog OpenAI-compatible provider.
- `createAgentsKitMcpServer({ tools })`, `createAgentTool({ ... })`,
  `fetchAgentSkill(id)` for programmatic use. Thin bridge over `@agentskit/tools/mcp`.
