# 0041 — Serialize attachments at the provider boundary

Status: proposed; implementation ready for maintainer review

## Context

The existing Message contract contains ordered ContentPart arrays alongside a
legacy string projection. Native provider serializers read only the projection,
so advertising image capability does not ensure that an image reaches the wire.
OpenAI-compatible gateways also need configurable authentication and endpoint paths.

## Decision

Reuse the existing adapter and message contracts. Serialize parts in the shared
provider history encoders, preserving order and tool-call correlation. Parts are
authoritative when present. Unsupported modalities, source formats or disabled
image capability raise an adapter-local CAPABILITY_UNSUPPORTED error before I/O.
No core types or contracts change; text-only wire behavior remains unchanged.

Use the existing OpenAI stream transport for configurable path, headers and fetch
and for gateway presets. Authentication is optional and supplied headers override
defaults case-insensitively. Resolve catalog placeholders from explicit caller
values; never read environment credentials inside the library. No new dependency.

## Consequences and evidence

Model-level capability must be supplied explicitly for custom compatible models;
transport support is not a claim about provider/model inference. Ollama supports
inline image data only; unsupported PDFs/URLs fail explicitly. Provider MIME and
access restrictions still apply. Shared encoders also serve Azure and Bedrock;
existing tool-history suites must pass alongside the new HTTP payload tests.

`packages/adapters/tests/multimodal-http.test.ts` exercises local HTTP capture,
stream/usage preservation, presets, source errors and tool history. Live provider
calls are a separate, currently pending evidence gate. No publication is authorized.
