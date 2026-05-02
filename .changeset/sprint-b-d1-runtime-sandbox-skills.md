---
'@agentskit/core': patch
'@agentskit/runtime': patch
'@agentskit/sandbox': patch
'@agentskit/skills': patch
---

chore(audit): Sprint B/D-P1 — RuntimeError / SandboxError / SkillError.

Adds three new typed error subclasses to `@agentskit/core/errors` and
converts the bare `throw new Error(...)` sites in their respective
packages.

**`@agentskit/core`** — new classes + codes:

- `RuntimeError` (`AK_RUNTIME_INVALID_INPUT`,
  `AK_RUNTIME_STEP_FAILED`, `AK_RUNTIME_DELEGATE_FAILED`).
- `SandboxError` (`AK_SANDBOX_DENIED`, `AK_SANDBOX_INVALID_TOOL`,
  `AK_SANDBOX_PEER_MISSING`, `AK_SANDBOX_BACKEND_FAILED`).
- `SkillError` (`AK_SKILL_INVALID`, `AK_SKILL_DUPLICATE`).

**`@agentskit/runtime`** — converts:

- `speculate.ts` — empty candidates → `ConfigError`; unknown picker id
  → `RuntimeError(AK_RUNTIME_INVALID_INPUT)`.
- `durable.ts` — replaying a previously-failed step →
  `RuntimeError(AK_RUNTIME_STEP_FAILED)` with hint to drop log.
- `topologies.ts` — empty supervisor / swarm / blackboard members →
  `ConfigError`; "every swarm member failed" →
  `RuntimeError(AK_RUNTIME_DELEGATE_FAILED)`.
- `background.ts` — invalid `every:` / cron schedule → `ConfigError`.

**`@agentskit/sandbox`** — converts:

- `sandbox.ts` — missing apiKey + backend → `ConfigError`.
- `e2b-backend.ts` — peer dep missing → `SandboxError(AK_SANDBOX_PEER_MISSING)`;
  Sandbox class missing → `SandboxError(AK_SANDBOX_BACKEND_FAILED)`.
- `policy.ts` — denied tool → `SandboxError(AK_SANDBOX_DENIED)`;
  no execute fn → `SandboxError(AK_SANDBOX_INVALID_TOOL)`.

**`@agentskit/skills`** — converts:

- `marketplace.ts` — invalid semver → `SkillError(AK_SKILL_INVALID)`;
  duplicate publish → `SkillError(AK_SKILL_DUPLICATE)`.
- `compose.ts` — empty composeSkills → `ConfigError`.

No message-string regressions — every existing `toThrow(/regex/)` still
matches. Test results: core 265/265, runtime 96/96, sandbox 25/25,
skills 83/83. Lints clean.
