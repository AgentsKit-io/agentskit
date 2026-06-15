---
"@agentskit/react": minor
"@agentskit/ink": minor
"@agentskit/rag": minor
"@agentskit/templates": patch
---

Ecosystem cohesion — correctness fixes:

- **react**: `TopologyGraphView` (and its prop types) are now re-exported from the
  package root — previously implemented and tested but unreachable from `@agentskit/react`.
- **ink**: `TopologyGraphView`, `InkThemeProvider`, `useInkTheme`, and `defaultInkTheme`
  are now re-exported from the package root — the theme system was previously
  unreachable from `@agentskit/ink`.
- **rag**: loaders and rerankers now throw a typed `RagError` (extends `AgentsKitError`)
  instead of a bare `Error`; new `RagError` / `RagErrorCodes` exports let callers narrow
  on `error.code`. Messages are unchanged.
- **templates**: `validate*Template` helpers now throw the typed `ConfigError`
  (`AK_CONFIG_INVALID`) instead of a bare `Error`.
