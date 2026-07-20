# RFC 0008 — `@agentskit/adapters` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: @EmersonBraun
- **Related**: [ADR 0001](../docs/architecture/adrs/0001-adapter-contract.md), [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/adapters` from beta to stable. The implementation now has mechanical
contract coverage and provider-specific resilience suites, but this proposal
does **not** promote the package or claim that the time- and release-based gates
have elapsed.

## Proposed stable commitment

At 1.0, the package commits to the public exports in its declaration snapshot
and to the Adapter v1 behavior pinned by ADR 0001. In particular:

- construction and `createSource` remain free of network I/O;
- every consumed stream has exactly one terminal `done` or `error` chunk;
- terminal errors carry an `Error` in `metadata.error`, including aborts,
  malformed provider data, and streams truncated before provider completion;
- tool-call chunks contain complete arguments, and provider-native histories
  preserve call/result identity and required turn grouping;
- abort propagates to active fetch readers or SDK requests;
- higher-order router, fallback, ensemble, mock, replay, and recording adapters
  preserve the same terminal and cancellation semantics;
- embedders either return a non-empty numeric vector or reject;
- `@mlc-ai/web-llm` and the AWS Bedrock SDK remain optional peers, so consumers
  pay only for the provider integrations they select.

Provider wire formats remain implementation details. Supporting an additive
provider, model, optional option, or metadata field is minor-compatible; removing
or renaming a public export, option, chunk behavior, or supported protocol needs
the stable deprecation and major-version process.

## Evidence already implemented

- Shared contract tests cover deferred I/O, exactly-one terminal behavior,
  complete tool calls, abort, and error metadata across fetch adapters.
- Provider suites cover completion markers, malformed/truncated streams,
  multi-turn tools, parallel tool results, credential placement, and protocol
  parsing for OpenAI-compatible, Anthropic, Gemini/Vertex, Ollama, Replicate,
  Bedrock, LangChain, WebLLM, and Vercel AI SDK integrations.
- The package clears its 90% line-coverage floor, strict TypeScript build, dual
  ESM/CJS build, and 20 KB compressed-size budget.
- Public API snapshots, packed-consumer smoke tests, supported Node/TypeScript
  compatibility, and Doc Bridge are repository-wide blocking gates.

## Gates that remain open

The package entered its current beta window on 2026-06-15. Therefore the
90-consecutive-day requirement cannot complete before 2026-09-13, and any
unplanned breaking change resets that clock. Promotion also requires:

1. releases from at least two distinct beta minor lines during that window;
2. an Accepted version of this dedicated RFC;
3. a complete `docs/stability/adapters.json` evidence manifest accepted in review;
4. every direct internal runtime, optional, and peer dependency at stable;
5. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until all five are true, `@agentskit/adapters` remains beta and consumers should
apply the beta pinning guidance from `docs/STABILITY.md`.

## Decision requested

Review whether the proposed public surface is narrow enough to support for the
full stable lifecycle and whether the provider-specific evidence is sufficient.
Acceptance records the intended freeze; it does not waive any remaining ADR 0024
gate or authorize promotion before the evidence exists.
