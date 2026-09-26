# ADR 0035 — Documentation pruning and API reference route consolidation

- **Status**: Proposed
- **Date**: 2026-09-25
- **Related ADRs**: ADR 0007

## Context

The generated API reference created one route for every public TypeScript
symbol (718 routes across eight packages). The route volume inflated the
sitemap and `llms-full.txt` and buried the hand-written guides, while TypeDoc
already groups symbols by package and category.

Several cookbook pages and recipes had also drifted from the packages or
duplicated a maintained guide:

| Removed page | Reason | Permanent redirect |
| --- | --- | --- |
| `/docs/cookbook/streaming` | Imported an `@agentskit/adapters/openai` subpath that the package does not export; streaming and `chat.stop()` are covered by the quickstart. | `/docs/get-started/getting-started/quickstart` |
| `/docs/cookbook/rate-limit` | Used a `tokenBucket` helper that no package exports. | `/docs/production/security/rate-limiting` |
| `/docs/cookbook/tool-confirmation` | Duplicated the HITL guide and the `ToolConfirmation` UI page. | `/docs/agents/hitl` |
| `/docs/cookbook/edge-deployment` | Duplicated the edge production guide. | `/docs/production/edge` |
| `/docs/reference/recipes/templates-cookbook` | Duplicated the templates package guide. | `/docs/reference/packages/templates` |
| `/docs/reference/recipes/figma-design-extraction` | Integration-specific walkthrough; the integration guide is canonical. | `/docs/agents/tools/integrations/figma` |
| `/docs/reference/recipes/hubspot-airtable-shopify-pulse` | Integration-specific walkthrough; the integration guide is canonical. | `/docs/agents/tools/integrations/hubspot` |
| `/docs/reference/recipes/jira-triage` | Integration-specific walkthrough; the integration guide is canonical. | `/docs/agents/tools/integrations/jira` |
| `/docs/reference/recipes/sentry-incident-bot` | Integration-specific walkthrough; the integration guide is canonical. | `/docs/agents/tools/integrations/sentry` |
| `/docs/reference/recipes/integrations` | Duplicated the integrations catalog with legacy projections. | `/docs/agents/tools/integrations` |
| `/docs/reference/recipes/more-providers` | Duplicated the hosted providers reference. | `/docs/data/providers/hosted` |

## Decision

Generate one API page per package and TypeDoc category. Each category page
keeps every symbol's description, signature, members, and cross-references
under a stable heading anchor. `gen-api.mjs` writes the symbol-to-anchor map to
`apps/docs-next/lib/api-symbol-routes.json`; the docs route issues a permanent
redirect from each former symbol URL (with or without `.md`) to its category
anchor.

Remove the pages listed above and keep a permanent redirect for each. Fold the
still-valid content into the destination guides: the quickstart shows
`chat.stop()`, the rate-limiting guide uses the real `createRateLimiter` API,
and the HITL guide uses `defineZodTool` and links the confirmation UI.

## Rationale

The reference stays complete and searchable while its route count tracks API
categories rather than individual exports. Readers following old links reach
the same content in one maintained place instead of a stale copy.

## Consequences

- The API reference has eight package pages and one page per non-empty
  category (42 routes instead of 718 symbol routes plus package pages).
- Individual symbols no longer have their own page title or description in
  search results.
- Old symbol URLs depend on the committed route map. `gen-api.mjs` refreshes it
  only when every package generates, so a partial TypeDoc run cannot drop
  redirects.
- `scripts/verify-api-consolidation.mjs` and
  `scripts/verify-cookbook-pruning.mjs` check the map, anchors, removed files,
  and redirects.

## Alternatives considered

- Keep every symbol as its own page: rejected because the route volume obscures
  the guide structure.
- Delete generated symbol detail: rejected because it removes useful reference
  content.
- Fix the stale cookbook pages in place: rejected because each duplicated a
  maintained guide.

## Open questions

None.

## References

- `apps/docs-next/scripts/gen-api.mjs`
- `apps/docs-next/lib/api-symbol-routes.json`
- `apps/docs-next/next.config.mjs`
