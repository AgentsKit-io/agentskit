---
---

Internal: add the project scanner (`packages/cli/src/components/scan.ts`, RFC-0006 D3/D4) — detects UI binding, meta-framework (incl. Next app vs pages, Angular SSR vs SPA, the no-server bundlers), package manager, TypeScript, src dir, import alias, styling, and monorepo signals from a project dir via an injectable filesystem. Pure + deterministic + fully unit-tested. Not exported from the package entry yet, so there is no public API change and no release.
