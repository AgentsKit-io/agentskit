---
name: feedback_json-schema-canonical
description: JSON Schema is the single source of truth for contracts; do not add Zod as a parallel canonical
metadata:
  type: feedback
---

**Fact:** `JSONSchema7` is the canonical schema format across `@agentskit/core`
(tool, manifest, agent-schema, security taxonomy). Zod is supported only as an
opt-in peer-dep convenience via `defineZodTool` (`packages/tools/src/zod.ts`) —
it is never bundled and never the source of truth.

**Why:** Two schema systems = duplication = the "inline schemas / no single
source of truth" failure mode. Core must also stay zero-dependency, which Zod
would violate. Runtime validation (ADR-0008) therefore validates *against the
existing JSON Schema* via the opt-in `@agentskit/validation` package (Ajv),
not by introducing a second contract language.

**How to apply:**
- New contracts → JSON Schema in core.
- Need runtime arg checking → `createAjvValidator()` from `@agentskit/validation`,
  passed as `validateArgs` on the controller/runtime.
- Resist any PR that makes Zod the canonical contract.

**Related:** [[feedback_zero-dep-core]], [[project_playbook-alignment]] — see
ADR-0008 (`docs/architecture/adrs/0008-runtime-validation.md`).
