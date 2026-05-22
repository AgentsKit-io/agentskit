---
"@agentskit/adapters": patch
"@agentskit/angular": patch
"@agentskit/cli": patch
"@agentskit/core": patch
"@agentskit/eval": patch
"@agentskit/eval-braintrust": patch
"@agentskit/ink": patch
"@agentskit/memory": patch
"@agentskit/observability": patch
"@agentskit/observability-langfuse": patch
"@agentskit/rag": patch
"@agentskit/react": patch
"@agentskit/react-native": patch
"@agentskit/runtime": patch
"@agentskit/sandbox": patch
"@agentskit/skills": patch
"@agentskit/solid": patch
"@agentskit/svelte": patch
"@agentskit/templates": patch
"@agentskit/tools": patch
"@agentskit/vue": patch
---

Resolve GitHub code-scanning alerts and refresh dependencies. No public
API changes.

Security:
- `polynomial-redos`: removed the ambiguous `\s*` in the fenced-block
  regex (`@agentskit/core` `parseUIMessage`).
- `bad-tag-filter` / `double-escaping` / `incomplete-multi-character-
  sanitization`: HTML stripping in `@agentskit/tools` (`fetchUrl`,
  `webSearch`) now loops until stable, drops unterminated `<!--`
  comments, and decodes `&amp;` last.
- `incomplete-sanitization`: hardened Markdown table cells
  (`@agentskit/eval`), Mermaid labels (`@agentskit/runtime` `flowToMermaid`),
  and assorted regex escaping.
- `incomplete-url-substring-sanitization`: `@agentskit/adapters` `openai()`
  matches the canonical OpenAI host exactly via `URL` parsing.
- `file-system-race`: `@agentskit/cli` `config init` creates files with
  the atomic `wx` open flag.

Dependencies: minor/patch sweep via `pnpm -r update` (`@types/node`,
`vitest`, `@types/react`, `vite`, `fumadocs-*`, `motion`, `svelte`,
`@angular/core`, `@cloudflare/workers-types`). `marked` (15 → 18) is a
major bump and was intentionally skipped.
