# Conventions — `@agentskit/templates`

Authoring toolkit for custom skills, tools, adapters, and on-disk package
scaffolds. Consumers reach for this package when they want to publish their
own AgentsKit assets with consistent blueprints and runtime validation.

## Scope

- **Validated factories** — `createToolTemplate`, `createSkillTemplate`,
  `createAdapterTemplate` apply defaults and enforce contract shape
- **Scaffold** — `scaffold({ type, name, dir, description?, overwrite? })`
  writes a build-ready package skeleton for one of eight shapes; generated
  implementation stubs must be completed before publication
- **Validators** — `validate*Template` assert well-formed definitions before
  registration

This package does **not** power `agentskit init` (the CLI has its own project
templates). Use `@agentskit/templates` programmatically or from custom CLIs.

## Scaffold types (8)

| Type | Generated contract |
|---|---|
| `tool` | `ToolDefinition` factory |
| `skill` | `SkillDefinition` constant |
| `adapter` | `AdapterFactory` factory |
| `memory-vector` | `VectorMemory` HTTP skeleton |
| `memory-chat` | `ChatMemory` + `MemoryRecord` (`serializeMessages`) |
| `flow` | `FlowRegistry` + `flow.yaml` |
| `embedder` | `EmbedFn` factory |
| `browser-adapter` | Browser `AdapterFactory` |

## Security posture (`scaffold`)

1. **Validate before any write** — type allowlist, non-empty `dir`,
   unscoped kebab-case `name`, optional description without NUL / max 1000 chars.
2. **Path containment** — destination is `resolve(dir, name)` and must stay
   inside `resolve(dir)`.
3. **No destination symlink follow** — `lstat` rejects an explicitly supplied
   `dir` or destination root when that final component is a symlink, including
   under `overwrite: true`.
4. **Collision-safe by default** — existing destination fails unless
   `overwrite: true`.
5. **Atomic promote** — files land in a sibling staging directory, then
   `rename` into place. Overwrite uses backup + rename with rollback.
6. **No partial trees** — staging is removed on failure; returned paths are
   always final destinations (never staging paths).

### Name rules (unscoped only)

`name` must match `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` — starts with a lowercase
letter; alphanumeric segments separated by single hyphens. No `@scope/`,
slashes, dots, spaces, uppercase, or NUL.

**Scoped packages are intentionally unsupported** in this beta line. A future
beta minor will document a migration if scopes are added.

### Generated package.json

- Never uses `*` dependency ranges
- Always `@agentskit/core: ^1.0.0`
- `flow` also gets `@agentskit/runtime: ^0.10.0`
- No invented deps (adapters/memory are not auto-added when unused)
- `engines.node: >=20`, `license: MIT`, `sideEffects: false`, dual ESM/CJS/types

### Generated source rules

- Named exports only in `src/index.ts` (tsup `export default defineConfig` is
  the sole technical exception in `tsup.config.ts`)
- `tsup` config uses `clean: true`
- `tsconfig` does not force `types: ['node']`
- `memory-chat` uses the real `MemoryRecord` shape (`{ version: 1, messages }`)

## Factories & validators

- `name` / `description` / `systemPrompt` — trim non-empty
- `execute` / `createSource` — must be functions
- `schema` — plain non-null, non-array object (JSON Schema; `type` not required)
- `temperature` — if provided, must be finite (no undocumented range clamp)
- `AdapterTemplateConfig.capabilities` and `SkillTemplateConfig.metadata`
  pass through to the produced definitions
- Legitimate base extensions are preserved via spread + selective overrides

## Adding a helper

1. Create `src/<helper>.ts` with a single focused export.
2. Prefer pure functions. Avoid classes.
3. Document the happy path in JSDoc above the export.
4. If the helper is generic enough for `@agentskit/core`, put it there first.

## Testing

- Unit-test every helper for at least one happy path and one error path.
- Scaffold tests must cover collision, symlink, invalid config, matrix of all
  eight types, determinism, and typecheck of generated sources against
  workspace TypeScript (no network).
- Schema validators must accept known-good definitions without changes.
- Package-manifest / purity tests assert dual exports and named surface.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Writing directly to the final destination | Stage sibling + atomic rename |
| Wildcard `*` deps in blueprints | Caret ranges only (`^1.0.0`, `^0.10.0`) |
| Treating `MemoryRecord` as `Message[]` | Use `serializeMessages` / `deserializeMessages` |
| Default export in package source | Named exports; tsup config is the exception |
| Claiming `agentskit init` uses this package | It does not — correct docs if you find that claim |

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (95% lines)
- [ ] Files under 400-line budget
- [ ] Helpers are pure functions where possible
- [ ] Defaults and security posture documented
- [ ] Schema validators round-trip correctly
- [ ] No `any` — `unknown` + narrow
