---
'@agentskit/adapters': minor
'@agentskit/skills': minor
---

feat: F3 platform expansion batch.

**Adapters:**
- `webllm` (#191) — Browser-only / WebGPU adapter via `@mlc-ai/web-llm` (optional peer). Runs LLMs 100% on-device. Capabilities: streaming-only.

**Skills:**
- `healthcareAssistant` + `clinicalNoteSummarizer` (#193) — vertical templates for healthcare. Refuse diagnosis / dosage / triage; SOAP-format note summarization that never interprets.
- `financialAdvisor` + `transactionTriage` (#193) — vertical templates for finance. Refuse tickers / "should you" / payment decisions; bookkeeping triage with fixed output.

**Docs (#190, #192):**
- `/docs/production/edge` documents the sub-50KB hot path budget for Cloudflare Workers / Deno Deploy / Vercel Edge / Bun, with per-runtime notes and a "what to skip" table.
- `/docs/production/embedded` documents three integration patterns (CLI task, webview, LSP) for VS Code + a Raycast script template.
