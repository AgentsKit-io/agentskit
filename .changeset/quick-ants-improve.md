---
'@agentskit/rag': minor
---

Use `@agentskit/net` for bounded HTTP reads and cancellable loader deadlines; `timeoutMs` now caps at 2,147,483,647ms. Forward abort signals to S3 SDK requests and request cancellation of async-iterable object bodies.
