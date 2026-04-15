# Conventions — `@agentskit/skills`

Pre-built personas (prompts + behavioral rules) that satisfy the Skill contract ([ADR 0005](../../docs/architecture/adrs/0005-skill-contract.md)).

## Scope

- General-purpose skills: researcher, critic, summarizer, coder, planner, debater
- Skill composition helpers when a pattern shows up repeatedly

## What does NOT belong here

- Skill implementations that require custom code paths beyond a prompt → they're probably not skills, they're runtimes or tools
- UI to edit skills → a future skill marketplace package

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

- Snake_case for `name` field (matches Tool convention).
- File name matches the skill: `code_reviewer.ts` exports `codeReviewer`.
- Keep names short — used in delegation tool names (`delegate_code_reviewer`).

## Testing

- Skills are mostly prompts; traditional unit tests don't apply.
- Provide a small **golden dataset** of `{ input, expected }` pairs per skill.
- Use `@agentskit/eval` to score the skill periodically. Don't block PRs on eval scores; do flag regressions.
- Schema-check that `name` matches the regex and that `systemPrompt` is non-empty.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Inline tool definitions inside a skill | Reference tools by name; let the runtime resolve |
| Multi-turn examples encoded as one input/output | Single-turn only in v1; encode multi-turn patterns in the prompt itself |
| Using `onActivate` for general init | Reserved for per-user dynamic tools; move general init elsewhere |
| Side effects at definition time (top-level `await`) | Move to `onActivate` or out of the skill |
| Pretending a skill can be invoked like a function | It's activated, not invoked. Pass to `runtime.run({ skill })` |

## Review checklist for this package

- [ ] Bundle size under 10KB gzipped
- [ ] Coverage threshold holds (95% lines — mostly structural checks)
- [ ] Every new skill has at least one example in `examples`
- [ ] Prompt reviewed by a second set of eyes for clarity
- [ ] Name matches the regex `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$`
- [ ] No inline tool implementations; names only
