# AgentsKit ecosystem readiness

- Audit date: 2026-07-14
- Overall: **blocked**
- Promotion allowed: **no**
- Products: 3 ready / 4 blocked / 0 incomplete (of 7)
- Findings: 10 (P0=2, P1=8)

## Products

### agentskit — blocked
- Repo: `AgentsKit-io/agentskit`
- Maturity: beta (source: ecosystem.json#products[agentskit].maturity)
- Audited on: 2026-07-14

### registry — blocked
- Repo: `AgentsKit-io/agentskit-registry`
- Maturity: beta (source: ecosystem.json)
- Audited on: 2026-07-14

### agentskit-chat — ready
- Repo: `AgentsKit-io/agentskit-chat`
- Maturity: alpha (source: ecosystem.json)
- Audited on: 2026-07-14

### playbook — ready
- Repo: `AgentsKit-io/agents-playbook`
- Maturity: stable (source: ecosystem.json)
- Audited on: 2026-07-14

### doc-bridge — ready
- Repo: `AgentsKit-io/doc-bridge`
- Maturity: stable (source: ecosystem.json)
- Audited on: 2026-07-14

### code-review — blocked
- Repo: `AgentsKit-io/code-review-cli`
- Maturity: alpha (source: ecosystem.json)
- Audited on: 2026-07-14

### akos — blocked
- Repo: `AgentsKit-io/agentskit-os`
- Maturity: stable (source: ecosystem.json)
- Audited on: 2026-07-14

## Findings

- **P0** `akos` / `chat` (blocked): Production local-first AgentsChat composition is delivered in open PR #5317, not yet on main.
  - Remediation: Merge and deploy AgentsKit-io/agentskit-os#5317 (Ecosystem 11). (owner: AgentsKit-io/agentskit-os)
- **P0** `akos` / `documentation` (blocked): Ecosystem 11 site migration (local-first AgentsChat + journey) is still open on PR #5317.
  - Remediation: Merge AgentsKit-io/agentskit-os#5317 and close #5314 with production evidence. (owner: AgentsKit-io/agentskit-os)
- **P1** `agentskit` / `readme` (blocked): README Standard v1 root surface is on main; package/app rollout PR #1233 is still open.
  - Remediation: Merge AgentsKit-io/agentskit#1233 package/app README rollout, then re-audit. (owner: AgentsKit-io/agentskit)
- **P1** `akos` / `accessibility` (blocked): Migration PR adds chat E2E; full a11y certification pending merge.
  - Remediation: Complete Ecosystem 11 acceptance matrix after #5317 merges. (owner: AgentsKit-io/agentskit-os)
- **P1** `akos` / `llms` (blocked): llms.txt route exists; llms-full and raw routes land with #5317.
  - Remediation: Merge #5317 and verify /llms.txt and /llms-full.txt on akos.agentskit.io. (owner: AgentsKit-io/agentskit-os)
- **P1** `akos` / `performance` (blocked): Web performance budgets pending post-migration Lighthouse evidence.
  - Remediation: Capture Lighthouse evidence after #5317 deploys. (owner: AgentsKit-io/agentskit-os)
- **P1** `akos` / `readme` (blocked): README Standard v1 root certification PR open.
  - Remediation: Merge AgentsKit-io/agentskit-os#5318. (owner: AgentsKit-io/agentskit-os)
- **P1** `akos` / `seo` (blocked): SITE defaults to akos.agentskit.io; full SEO parity pending migration merge.
  - Remediation: Merge AgentsKit-io/agentskit-os#5317 and verify sitemap/robots/canonicals on production. (owner: AgentsKit-io/agentskit-os)
- **P1** `code-review` / `readme` (blocked): README Standard v1 certification PR open.
  - Remediation: Merge AgentsKit-io/code-review-cli#6 and re-audit. (owner: AgentsKit-io/code-review-cli)
- **P1** `registry` / `readme` (blocked): README Standard v1 certification PR open for root README.
  - Remediation: Merge AgentsKit-io/agentskit-registry#79 and re-run check:readme-standard on main. (owner: AgentsKit-io/agentskit-registry)

Broad promotion remains gated until overall status is `ready`.

