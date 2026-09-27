---
'@agentskit/cross-platform': minor
---

New package: one place for OS and runtime portability. `spawnProcess` / `runCommand` resolve Windows `.cmd` shims without a shell, send input over stdin, and kill the whole process tree on timeout, with native adapters for Node, Bun and Deno. Also ships forward-slash path helpers, EOL-safe text helpers, lock-tolerant filesystem helpers, a browser-safe `/pure` subpath, and the `agentskit-cross-platform check` guardrail (ADR-0036).
