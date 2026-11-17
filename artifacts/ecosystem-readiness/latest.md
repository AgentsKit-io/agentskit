# AgentsKit ecosystem readiness

- Audit date: 2026-11-17
- Overall: **blocked**
- Promotion allowed: **no**
- Products: 0 ready / 6 blocked / 0 incomplete (of 6)
- Findings: 12 (P0=5, P1=1)

## Products

### agentskit — blocked
- Repo: `AgentsKit-io/agentskit`
- Maturity: beta (source: ecosystem.json#products[agentskit].maturity)
- Audited on: 2026-11-16

### registry — blocked
- Repo: `AgentsKit-io/agentskit-registry`
- Maturity: beta (source: ecosystem.json)
- Audited on: 2026-07-14

### agentskit-chat — blocked
- Repo: `AgentsKit-io/agentskit-chat`
- Maturity: alpha (source: ecosystem.json)
- Audited on: 2026-07-14

### playbook — blocked
- Repo: `AgentsKit-io/agents-playbook`
- Maturity: stable (source: ecosystem.json)
- Audited on: 2026-07-14

### doc-bridge — blocked
- Repo: `AgentsKit-io/doc-bridge`
- Maturity: stable (source: ecosystem.json)
- Audited on: 2026-07-14

### code-review — blocked
- Repo: `AgentsKit-io/code-review`
- Maturity: alpha (source: ecosystem.json)
- Audited on: 2026-07-14

## Findings

- **P0** `agentskit-chat` / `evidence-freshness` (fail): Evidence is 126 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agentskit-chat)
- **P0** `code-review` / `evidence-freshness` (fail): Evidence is 126 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/code-review)
- **P0** `doc-bridge` / `evidence-freshness` (fail): Evidence is 126 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/doc-bridge)
- **P0** `playbook` / `evidence-freshness` (fail): Evidence is 126 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agents-playbook)
- **P0** `registry` / `evidence-freshness` (fail): Evidence is 126 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agentskit-registry)
- **P1** `agentskit` / `quickstart` (fail): 2 failures: ecosystem bar mobile-overflow CSS assertion and @agentskit/core/rules missing from the agent handoff doc.
  - Remediation: Fix scripts/reference-docs-vertical.test.mjs expectations and document @agentskit/core/rules in the agent handoff, then re-run pnpm test:reference-docs. (owner: AgentsKit-io/agentskit)
- **P2** `agentskit` / `accessibility` (blocked): No browser (Playwright/axe) available on the audit host.
  - Remediation: Run the accessibility audit on a host with a browser and update this gate. (owner: AgentsKit-io/agentskit)
- **P2** `agentskit` / `documentation` (fail): pnpm check:quality-gates fails the 'ecosystem documentation quality contract' gate: the certified llms.txt drifted from the attested commit f69eddb (not an ancestor of HEAD). Pre-existing on main.
  - Remediation: Re-attest docs/evidence/ecosystem-documentation-quality/agentskit.json against a commit on main that includes the current llms.txt, then re-run pnpm check:quality-gates. (owner: AgentsKit-io/agentskit)
- **P2** `agentskit` / `maturity` (blocked): Not re-run in this audit; pnpm check:quality-gates, which covers it, exited 1 (ecosystem documentation quality contract).
  - Remediation: Re-run after pnpm check:quality-gates is green. (owner: AgentsKit-io/agentskit)
- **P2** `agentskit` / `performance` (fail): Exit 1 only because of the 'ecosystem documentation quality contract' gate; the nested ternary gate, the size-limit target check and the verified recipe factory pass.
  - Remediation: Fix the ecosystem documentation quality contract gate (see documentation) and re-run pnpm check:quality-gates. (owner: AgentsKit-io/agentskit)
- **P2** `agentskit` / `security` (blocked): Not re-run in this audit; pnpm check:quality-gates, which covers it, exited 1 (ecosystem documentation quality contract).
  - Remediation: Re-run after pnpm check:quality-gates is green. (owner: AgentsKit-io/agentskit)
- **P2** `agentskit` / `seo` (blocked): No browser (Lighthouse/Playwright) available on the audit host.
  - Remediation: Run the SEO audit on a host with a browser and update this gate. (owner: AgentsKit-io/agentskit)

Broad promotion remains gated until overall status is `ready`.

