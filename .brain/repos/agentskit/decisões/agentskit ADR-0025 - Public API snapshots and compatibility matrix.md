---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0025-public-api-and-compatibility-gates.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0025 - Public API snapshots and compatibility matrix

> [!tldr] Em linguagem comum
> Public API snapshots and compatibility matrix.

← [[00 Decisões - agentskit]]

## Status e datas

- Status: Accepted; - Date: 2026-07-16.

## Decisão em linguagem comum

AgentsKit commits a versioned public API snapshot generated from every public
declaration entry. Schema version 1 records package names, export subpaths,
public export conditions, exported symbol names, and whether each symbol is a
type, runtime value, or both. Asset-only exports are recorded structurally.

The snapshot deliberately excludes timestamps, package versions, inferred type
strings, declaration bodies, and private chunk filenames. Any drift fails CI.
Intentional additions and removals require an explicit baseline update whose
diff is reviewed alongside the affected package's changeset.

Packed consumer fixtures compile every applicable public subpath using:

- TypeScript 5.9, the minimum supported compiler line;
- TypeScript 6.0, the primary compiler line;
- `moduleResolution: bundler` and `moduleResolution: NodeNext` on both lines.

Node.js compatibility follows the upstream lifecycle rather than a permanently
pinned list:

- the oldest supported LTS line is the compatibility floor;
- the active LTS line is blocking;
- the current pre-LTS line is a non-blocking canary;
- EOL lines are removed from the matrix.

At adoption, Node 22 is the floor and release runtime, Node 24 is blocking, and
Node 26 is the canary. Updating numeric versions to follow this lifecycle does
not require a new ADR unless the policy itself changes.

## Contexto

ADR 0024 requires explicit API and portability evidence before a package can
graduate. Workspace tests and successful builds do not detect accidental export
removal, declaration drift, broken packed resolution, or incompatibility with a
supported Node.js or TypeScript line.

The ecosystem contains 22 public packages and several host-specific surfaces.
A per-package API-extractor configuration would add substantial configuration
and review noise, while a single unversioned CI runtime would leave consumers on
other supported toolchain lines unprotected.

## Consequências

### Positive

- Accidental public surface drift becomes visible and attributable by package.
- Declaration consumers are exercised on both supported TypeScript generations.
- Node LTS compatibility is explicit and continuously tested.
- Canary failures provide migration time before the next Node line becomes LTS.

### Negative

- Intentional API additions require a reviewed baseline update.
- Compatibility CI performs additional full package builds on Node 24 and 26.
- Symbol-name snapshots do not prove semantic assignability of every signature.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0025-public-api-and-compatibility-gates.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0025-public-api-and-compatibility-gates.md:1`
