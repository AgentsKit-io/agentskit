# Conventions — `@agentskit/templates`

Authoring toolkit for custom skills, tools, and runtimes. The package consumers reach for when they want to publish their own assets.

## Scope

- **Scaffold helpers** — `createSkill`, `createTool`, `createRuntime` wrappers that apply sensible defaults
- **Template strings / prompts** — reusable prompt fragments (role setup, output format directives, citation patterns)
- **Validation helpers** — confirm a `ToolDefinition` or `SkillDefinition` satisfies its contract before shipping

## Adding a helper

1. Create `src/<helper>.ts` with a single focused export.
2. Prefer pure functions. Avoid classes.
3. Document the happy path in JSDoc above the export.
4. If the helper is generic enough to move into `@agentskit/core`, consider that first — only add here if it's authoring-specific.

## Adding prompt fragments

- Organize by purpose: `src/prompts/<category>.ts` → `roles.ts`, `formats.ts`, `citations.ts`.
- Export as named constants: `export const citeBracketedNumbers = '...'`.
- No templating DSL. Plain strings with placeholder comments.

## Testing

- Unit-test every helper for at least one happy path and one error path.
- Schema validators must round-trip a known-good definition without changes.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Exporting a giant `create*` that does everything | Split into small composable helpers |
| Hiding defaults inside the helper | Document defaults in JSDoc; accept overrides via options |
| Validating tools with a custom schema validator | Use JSON Schema 7 — aligned with the Tool contract |

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (95% lines)
- [ ] Helpers are pure functions
- [ ] Defaults documented
- [ ] Schema validators round-trip correctly
