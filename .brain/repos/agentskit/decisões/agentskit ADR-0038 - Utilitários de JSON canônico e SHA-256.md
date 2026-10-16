---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0038-canonical-json-hash.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256

> [!tldr] Em linguagem comum
> Utilitários de JSON canônico e SHA-256. O core os expõe pelo subcaminho `@agentskit/core/hash`. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-09-29.

## Decisão em linguagem comum

Expose `canonicalJson` and `sha256Hex` from the opt-in
`@agentskit/core/hash` subpath. Canonical JSON follows RFC 8785; undefined object
properties are omitted and undefined array entries follow JSON round-trip
behavior. The helper is not re-exported from the main `@agentskit/core` entry.
Use it in the CLI audit chain and evaluation replay fingerprints, retaining
fixtures for hashes already persisted by the previous implementations.

Build-time dependencies are bundled into this subpath. The published core
package keeps zero runtime dependencies, and its main entry remains under its
10 KB gzip budget.

## Contexto

Several packages implemented canonical JSON and SHA-256 separately. Their
serialization differed for `undefined`, property ordering, and values that are
not JSON data. Persisted audit-chain entries and evaluation cassettes also rely
on fingerprints remaining stable across releases.

## Consequências

- New consumers use this subpath instead of local canonicalization and hashing
  implementations.
- Hash compatibility is checked against committed legacy fixtures.
- Inputs outside the JSON data model fail instead of receiving an accidental
  or implementation-specific serialization.

## Pacotes afetados

- [[agentskit-core]] (`./hash`), [[agentskit-runtime]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0038-canonical-json-hash.md:1`
