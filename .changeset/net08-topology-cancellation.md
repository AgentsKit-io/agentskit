---
'@agentskit/runtime': minor
---

Topology `AgentHandle.run` now accepts an optional cancellation signal as its third argument, and swarm member deadlines cancel child work through `@agentskit/net`. Invalid `timeoutMs` values now raise `ConfigError` (`AK_CONFIG_INVALID`) synchronously; configured deadlines must be finite, greater than 0, and no greater than 2,147,483,647 milliseconds.
