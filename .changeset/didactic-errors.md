---
"@agentskit/core": minor
---

Add didactic error system with Rust-compiler-style messages. New error classes (AgentsKitError, AdapterError, ToolError, MemoryError, ConfigError) include error codes, fix hints, and docs links. Replaces plain Error throws in core stream and tool execution paths.
