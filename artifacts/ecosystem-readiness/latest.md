# AgentsKit ecosystem readiness

This mutable `latest` alias points to the immutable snapshot [`readiness-2026-08-14.md`](./readiness-2026-08-14.md). Keep the dated artifact as the audit record and update this alias when a newer readiness run is published.

- Audit date: 2026-08-14
- Overall: **blocked**
- Promotion allowed: **no**
- Products: 0 ready / 7 blocked / 0 incomplete (of 7)
- Findings: 7 (P0=7, P1=0)

## Products

### agentskit — blocked
- Repo: `AgentsKit-io/agentskit`
- Maturity: beta (source: ecosystem.json#products[agentskit].maturity)
- Audited on: 2026-07-14

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
- Repo: `AgentsKit-io/code-review-cli`
- Maturity: alpha (source: ecosystem.json)
- Audited on: 2026-07-14

### akos — blocked
- Repo: `AgentsKit-io/agentskit-os`
- Maturity: stable (source: ecosystem.json)
- Audited on: 2026-07-14

## Findings

- **P0** `agentskit` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agentskit)
- **P0** `agentskit-chat` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agentskit-chat)
- **P0** `akos` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agentskit-os)
- **P0** `code-review` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/code-review-cli)
- **P0** `doc-bridge` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/doc-bridge)
- **P0** `playbook` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agents-playbook)
- **P0** `registry` / `evidence-freshness` (fail): Evidence is 31 days old (maximum 30)
  - Remediation: Re-run the product audit and commit current evidence. (owner: AgentsKit-io/agentskit-registry)

Broad promotion remains gated until overall status is `ready`.
