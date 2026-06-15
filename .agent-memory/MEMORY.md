# Agent Memory Index

In-repo institutional memory, versioned with the code. One line per memory;
the body of each fact lives in its own file. Agents read this index first.

- `project_playbook-alignment` — repo is audited against playbook.agentskit.io; what conforms and what is intentionally adapted
- `feedback_json-schema-canonical` — JSON Schema is the single schema source of truth; never add Zod as a parallel canonical
- `feedback_zero-dep-core` — @agentskit/core takes zero runtime deps; heavy deps go in opt-in packages behind injection points
- `reference_quality-gates` — the structural gates, where they live, and how baselines work
- `project_v1-readiness` — 2026-06-15 24-pkg v1.0 audit; Phase 0 (honest tiers + stability gates) landed; plan in docs/studies/v1-readiness-audit.md
- `project_file-size-baselines` — oversized files pinned in check-file-size; shrink-only, never raise
- `reference_security-surfaces` — egress (safeFetch, ADR-0010) + inbound chat-trigger validation (ADR-0011); both opt-in, reuse ArgsValidator
- `reference_models-catalog` — models.dev-driven catalog (#911): `/catalog` subpath isolation, no-runtime-fetch default, opt-in live pricing fallback, openaiCompatible signal caveat
