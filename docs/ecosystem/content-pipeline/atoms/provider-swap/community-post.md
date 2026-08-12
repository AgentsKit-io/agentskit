## Swap the model provider without rewriting the agent

Agent applications should be able to change between OpenAI, Anthropic, Gemini, OpenRouter, Groq, and Ollama without moving provider-specific logic into the task, runtime, tools, or result handling.

### Try it

```bash
npm install @agentskit/adapters @agentskit/core @agentskit/runtime tsx
cp apps/docs-next/fixtures/provider-swap/agent.ts ./agent.ts
npx tsx agent.ts
```

### Claims
25 native adapters, 140 providers

Source fixture: `apps/docs-next/fixtures/provider-swap/agent.ts`

Status: draft — awaiting human approval before community publish.
