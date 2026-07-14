# Ecosystem launch package

Issue: [#1205](https://github.com/AgentsKit-io/agentskit/issues/1205)  
Parent: [#1198](https://github.com/AgentsKit-io/agentskit/issues/1198)

This directory is the **versioned community launch package**: funnel paths, verified demos, starter issues, maintainer expectations, metrics, and a draft announcement.

Public promotion remains gated by:

1. Ecosystem readiness (`#1204`) overall `ready`
2. HITL approval fields in `launch-package.json`

## Commands

```bash
pnpm check:launch-package
pnpm test:launch-package
```

## Files

| File | Purpose |
|---|---|
| `launch-package.json` | Machine contract for the funnel and demos |
| `contribution-matrix.json` | Expected contribution surfaces per public repo |
| `announcement.md` | Draft announcement (not auto-published) |
| Public docs | `/docs/reference/contribute/newcomer-journey` and related pages |
| Campaign landing | `/community` |
