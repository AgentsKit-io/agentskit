---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0040-eval-replay-fingerprint-compatibility.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0040 - Preserve eval replay fingerprint compatibility

> [!tldr] Em linguagem comum
> Preserve eval replay fingerprint compatibility.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Proposed; - **Date**: 2026-09-30.

## Decisão em linguagem comum

Keep the eval projection and serializer unchanged. Do not replace them with
`canonicalJson` until a versioned cassette/fingerprint migration can preserve
persisted fingerprints and rejection behavior. Retain literal fingerprint and
record/serialize/parse/strict-replay regression coverage for the current
contract.

## Contexto

`fingerprintRequest` fingerprints a deliberate projection of `AdapterRequest`:
provider-visible message and context fields, including tool schemas but excluding
executable tool callbacks and volatile message identity. Existing cassette
fingerprints are persisted and strict replay compares them directly.

The projection's serializer is observably different from
`@agentskit/core/hash`'s RFC 8785 `canonicalJson`: dates use a `{"$date": ...}`
tag; undefined array entries, non-finite numbers, cycles, and unsupported
objects reject with eval `ConfigError`; and integer-like keys are emitted in
JavaScript property enumeration order. `canonicalJson` emits dates as ISO
strings, maps undefined array entries to `null`, orders keys canonically,
accepts a `Map` as `{}`, and throws generic `Error` values for non-finite
numbers and cycles. Hashing an unprojected request would also include
executable callbacks, which are not replay input.

## Consequências

- ADR 0038's migration to core hashing applies to eval only after compatibility
  is demonstrated or a versioned migration is approved.
- New eval fingerprint behavior must account for the persisted v1 cassette
  contract; core canonical JSON remains the default for new JSON hashing.
- Documentation and regression tests are sufficient for this compatibility
  decision; no runtime behavior or public API changed.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0040-eval-replay-fingerprint-compatibility.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0040-eval-replay-fingerprint-compatibility.md:1`
