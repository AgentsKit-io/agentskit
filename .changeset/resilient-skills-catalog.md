---
"@agentskit/skills": minor
"@agentskit/cli": patch
---

Harden the skills catalog, composition, discovery, and marketplace boundaries.

`composeSkills` now returns defensive definitions, produces ADR-0005-compatible
names such as `researcher_coder`, and applies deterministic precedence for
references, examples, temperature, metadata, and dynamic activation tools. The
package exposes `getBuiltinSkills`, discovers all 26 bundled skills, validates
strict SemVer and malformed registry inputs, and isolates prototype-sensitive
metadata across publish/list/install operations. The CLI now resolves its skill
catalog from the package instead of a duplicated five-skill registry.

This is a beta breaking change for consumers that persisted the previous `+`-joined
composed skill names; migrate those identifiers to the new S1-compatible names.
