# Ecosystem manifest and claim ledger

AgentsKit is the parent brand for a family of products. The root
[`ecosystem.json`](../../ecosystem.json) is the canonical, versioned inventory
of those products and their public surfaces. The generated
[`ecosystem-claims.json`](../../ecosystem-claims.json) is the canonical ledger
for numeric product claims and their evidence.

The manifest owns stable identity and relationships: product IDs, names,
repositories, maturity, documentation and chat modes, public URLs, shared
navigation order, and useful next-product links. It does not own numeric
marketing claims.

The root `properties` array is a deprecated v1 compatibility projection for sibling
repositories that have not migrated yet. Do not add new consumers of it. Contract
validation prevents it from drifting from the corresponding v2 products.

The claim ledger owns exact values, optional conservative display floors, and
the evidence used to derive each value. It is deterministic and contains no
timestamps. The generator never fetches sibling sites at build time; a sibling
starts as `declared` with an empty claim list until its own repository exposes a
verifiable snapshot.

## Update workflow

1. Edit `ecosystem.json` when a product identity, surface, or relationship
   changes.
2. Edit the owning repository's derivation script when a numeric definition
   changes. For AgentsKit, that script is `scripts/compute-stats.mjs`.
3. Run `pnpm test:ecosystem`.
4. Run `node scripts/gen-ecosystem-claims.mjs` and
   `node scripts/sync-ecosystem.mjs`.
5. Run both commands with `--check` before opening a pull request.

Do not hand-edit generated copies under `apps/*/lib` or the generated product
block in `apps/docs-next/public/ecosystem-bar.js`.

## Consumer example

Server and build-time consumers can import the committed snapshot without a
network request:

```ts
import { claimsFor } from '@/lib/ecosystem-claims'

const packageClaim = claimsFor('agentskit').find((claim) => claim.id === 'packages')
const copy = packageClaim
  ? `${packageClaim.conservativeFloor ?? packageClaim.value}+ ${packageClaim.noun}`
  : 'AgentsKit packages'
```

External consumers can read the static `/api/claims.json` route. Existing
`/api/stats.json` consumers remain supported; the claim ledger is additive.

See [ADR-0021](./adrs/0021-ecosystem-manifest-and-claims.md) for the decision and
trade-offs.
