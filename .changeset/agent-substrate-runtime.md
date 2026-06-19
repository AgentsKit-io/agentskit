---
"@agentskit/runtime": minor
---

Add two agent-substrate primitives so registry/AKOS agents stop hand-rolling them: `invokeStructured({ adapter, tool, task, parse, skill? })` — first-class structured output (run a skill, force one `submit_*` tool call, read it from `result.toolCalls`, return the validated value); and `piiDenyValidator(opts?)` — a `Validator` that fails when output still contains PII, bridging `@agentskit/core/security`'s redactor into `createValidatorGuard` as a deterministic last-line gate.
