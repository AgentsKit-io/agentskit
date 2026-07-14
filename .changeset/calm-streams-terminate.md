---
'@agentskit/adapters': patch
---

Treat OpenAI-compatible streams that close without a done sentinel or finish reason as errors instead of successful completion.
