---
"@agentskit/core": minor
"@agentskit/cli": minor
---

Configurable PII taxonomy — load redaction rules from JSON instead of forking the package. Closes #793.

- `@agentskit/core/security`: new `validatePIITaxonomy`, `compilePIITaxonomy`, `PII_TAXONOMY_JSON_SCHEMA`. Taxonomy v1 is a JSON-friendly mirror of `PIIRule[]` (regex source + flags + replacer + description) plus a Draft-07 schema for editor / tooling integration. `compilePIITaxonomy` validates first, then materializes `RegExp` instances and forces the `g` flag so global replace works.
- `packages/core/src/security/default-taxonomy.json`: starter taxonomy (email / phone / SSN / IPv4 / credit-card / UUID) — same patterns as the in-code `DEFAULT_PII_RULES`, ready to copy into a customer's own file as a starting point.
- `@agentskit/cli`: new `agentskit pii lint <file...>` command. Validates one or more taxonomy files, returns non-zero on any failure, supports `--json` for CI integration.

Unblocks the memory-write redaction (#791), trace/replay redaction (#792), and redaction audit trail (#794) follow-ups — they all consume the same taxonomy contract.
