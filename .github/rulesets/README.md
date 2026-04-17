# Branch rulesets

Committed branch-protection rulesets for this repo. Source of truth — the GitHub UI should mirror these files, not the other way around.

## Files

- `main-protection.json` — protects `refs/heads/main`. PRs required, CI gates required, no force-push, no deletion, linear history.

## Applying

GitHub doesn't auto-sync committed JSON rulesets. Two options:

### Option A — GitHub UI (one-time)
1. **Settings → Rules → Rulesets → New branch ruleset → Import**
2. Upload `main-protection.json`.
3. Review and **Create**.

### Option B — gh CLI
```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/AgentsKit-io/agentskit/rulesets \
  --input .github/rulesets/main-protection.json
```

## Updating

Edit the JSON, open a PR, get it reviewed, then re-import (or `PUT /rulesets/{id}` via the API).

## Required status checks

The `required_status_checks` list must match job names produced by `.github/workflows/`. If you rename a job, update the ruleset in the same PR.

Current expected checks:
- `Lint, Test, Build` (from `ci.yml`)
- `build` (from `docs.yml`)
- `size` (from `size.yml`)
- `coverage` (from `coverage.yml`)
