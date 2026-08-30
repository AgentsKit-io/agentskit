# VitePress and Starlight adapter QA plan

This plan records the local acceptance criteria for the first-party VitePress and Astro Starlight human-documentation adapters.

## Contract checks

- A VitePress corpus scans Markdown and MDX below its configured documentation root, maps `index` files to their directory route, respects an optional `urlPrefix`, and keeps Doc Bridge join metadata (`package`, `module`, or `id`) stable.
- A Starlight corpus scans Markdown and MDX below its configured content root, uses Astro's optional `slug` frontmatter for the public route, maps index pages correctly, respects an optional `urlPrefix`, and keeps Doc Bridge join metadata stable.
- Both adapters reject roots outside the project through the shared bounded, containment-aware scanner.
- Neither adapter executes framework configuration or user JavaScript.
- Existing Fumadocs, Docusaurus, and plain-Markdown behavior remains unchanged.

## Local verification

1. Add focused fixtures for default routes, index routes, metadata overrides, URL prefixes, and nested agent-corpus exclusion.
2. Run `pnpm vitest run tests/human-adapters.test.ts tests/schemas.test.ts`.
3. Run `pnpm typecheck` and `pnpm build` to validate the public configuration type and emitted declarations.
4. Run the complete `pnpm test` suite to detect regressions.
5. Run `git diff --check` and inspect the final diff for scope and generated-file noise.
