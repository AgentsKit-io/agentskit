---
"@agentskit/core": patch
---

Keep older pending or superseded tool calls from blocking later controller turns, recover decisions after a pending-registration save failure, and resume interrupted streaming messages loaded from memory. Use a fresh run ID for durable decision executions outside a live stream.
