1/ Swap the model provider without rewriting the agent

Why it exists: Agent applications should be able to change between OpenAI, Anthropic, Gemini, OpenRouter, Groq, and Ollama without moving provider-specific logic into the task, runtime, tools, or result handling.

2/ The path:
1. `npm install @agentskit/adapters @agentskit/core @agentskit/runtime tsx`
2. `cp apps/docs-next/fixtures/provider-swap/agent.ts ./agent.ts`
3. `npx tsx agent.ts`

3/ Claims (generated, not hand-typed):
- 25 native adapters
- 140 providers

4/ Next products:
- AgentsKit: Build agents without gluing many libraries together.
- AgentsKit Registry: Copy ready-made agents and own the source.
- AgentsKit Chat: Define one agent experience and deliver it across interfaces.

5/ This thread is a draft atom. Publishing requires explicit human approval.
