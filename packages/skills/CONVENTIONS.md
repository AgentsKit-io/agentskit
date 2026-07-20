# Conventions — `@agentskit/skills`

Pre-built personas (prompts + behavioral rules) that satisfy the Skill contract ([ADR 0005](../../docs/architecture/adrs/0005-skill-contract.md)).

## Scope

- Declarative general-purpose, engineering, data, support, and regulated-domain skills
- Composition, defensive discovery, and the in-memory marketplace boundary

## What does NOT belong here

- Skill implementations that require custom code paths beyond a prompt → they're probably not skills, they're runtimes or tools
- Hosted registry, ratings, authentication, or marketplace UI

## Adding a new skill

1. Create `src/<skill-name>.ts`.
2. Export a `SkillDefinition` as a named constant: `export const summarizer: SkillDefinition = { ... }`.
3. Required fields: `name`, `description` (one line), `systemPrompt` (the soul of the skill).
4. Optional: `examples` (single-turn), `tools` (array of tool **names**, not definitions), `delegates`, `temperature`, `metadata`.
5. Re-export from `src/index.ts`.

## Writing the system prompt

The system prompt is the contract with the model. Invest here.

- **State the role clearly** in the first line: "You are a meticulous code reviewer."
- **Describe the workflow** as numbered steps. Models follow structure.
- **Specify the output format** — markdown? JSON? prose?
- **Include constraints** that would otherwise be forgotten (terse, cite sources, no speculation).
- **Avoid adjectives**. "Excellent senior engineer" adds nothing.

Real skills in this package are the best reference. Read `researcher.ts`, `critic.ts`, `coder.ts` before writing a new one.

## Pure declarative — no execute

Skills do **not** have a `run` or `execute` method. Confusing them with tools is the most common mistake. If you want a function the model calls, it's a Tool. If you want a persona the model becomes, it's a Skill.

The only function on a `SkillDefinition` is `onActivate`, and it's used **only** for per-user/per-tenant dynamic tool construction. General initialization belongs elsewhere.

## Naming

- Kebab-case for bundled multi-word `name` fields; all names must satisfy ADR 0005 S1.
- File name follows the package grouping; named exports use camelCase (`codeReviewer`).
- Keep names short — used in delegation tool names (`delegate_code_reviewer`).

## Testing

- Every built-in runs through `tests/adr-0005-contract.test.ts`; do not create a smaller private contract harness.
- Provide at least one structurally valid `{ input, output }` example per bundled skill. ADR 0005 keeps examples optional for consumer-defined skills; this is a catalog quality policy.
- Add focused safety or vertical tests when the prompt has domain-specific boundaries.
- Use `@agentskit/eval` to score the skill periodically. Don't block PRs on eval scores; do flag regressions.
- Composition and marketplace changes require mutation-isolation, malformed-input, and interoperability coverage.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Inline tool definitions inside a skill | Reference tools by name; let the runtime resolve |
| Multi-turn examples encoded as one input/output | Single-turn only in v1; encode multi-turn patterns in the prompt itself |
| Using `onActivate` for general init | Reserved for per-user dynamic tools; move general init elsewhere |
| Side effects at definition time (top-level `await`) | Move to `onActivate` or out of the skill |
| Pretending a skill can be invoked like a function | It's activated, not invoked. Pass to `runtime.run({ skill })` |

## Review checklist for this package

- [ ] Bundle size under 28 KB compressed (`.size-limit.json`)
- [ ] Coverage threshold holds (95% lines — mostly structural checks)
- [ ] Central ADR 0005 harness and the relevant vertical/safety suite cover the change
- [ ] Every bundled skill has at least one example in `examples`
- [ ] Prompt reviewed by a second set of eyes for clarity
- [ ] Name matches the regex `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$`
- [ ] No inline tool implementations; names only
- [ ] User-facing changes include a Changeset and keep README, canonical docs, and Doc Bridge aligned
