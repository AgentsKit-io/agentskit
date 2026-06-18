---
---

Internal: add the component install validator (`packages/cli/src/components/validate.ts`, RFC-0006 install-flow step 5). `validateInstall({ scan, component, installed })` resolves the port by `uiBinding` and checks framework-target support, peer version ranges (with a dependency-free range satisfier), runtime/embedding satisfiability, server-only env scope, TS/JS compatibility, styling, and serverless rate-limit durability — returning structured error/warning issues, never throwing. Fully unit-tested. Not exported from the package entry yet, so there is no public API change and no release.
