---
'@agentskit/sandbox': minor
---

Harden the beta sandbox surface without promoting it to stable. E2B now validates apiKey/timeouts, passes `timeoutMs` and `allowInternetAccess` (network default false), coalesces concurrent init, kills orphan VMs on dispose-during-init and execute timeout, and only classifies genuine module-not-found as peer missing. createSandbox/sandboxTool validate language and timeout, dispose idempotently, and rethrow config/peer errors from warmup. Web Worker fully narrows outbound messages, byte-caps output, and documents thread+DOM isolation only (not WebContainer). Local runtimes scope seatbelt reads, reject docker escape args, cap nodeSpawner stdout+stderr by total bytes, and snapshot policies. `@e2b/code-interpreter` is an optional peer.
