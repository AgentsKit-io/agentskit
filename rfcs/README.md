# RFCs

This directory holds **Requests for Comments** — proposals that are still being discussed. Once accepted and implemented, an RFC either graduates to an [ADR](../docs/architecture/adrs/) (for long-term contract decisions) or is archived.

## Process

1. Copy `_template.md` (if present) or follow the shape of existing RFCs
2. Name the file `NNNN-short-slug.md` where `NNNN` is a 4-digit sequence
3. Open a PR with status `Proposed`
4. Discussion happens in the PR comments
5. When consensus is reached, the author updates `Status` to `Accepted` or `Rejected` and merges
6. If implementation work follows, link the implementation PRs from the RFC

## Difference from ADRs

- **RFC** = proposal. Reversible. Status can change.
- **ADR** = decision already shipped. Immutable. Superseding requires a new ADR.

An RFC may grow into an ADR once the decision is committed and implemented.

## Index

| RFC | Title | Status |
|---|---|---|
| [0001](./0001-i18n-strategy.md) | Documentation i18n strategy | Proposed |
