---
name: project_playbook-alignment
description: repo is audited against playbook.agentskit.io; what conforms and what is intentionally adapted
metadata:
  type: project
---

**Fact:** AgentsKit is measured against the Agents Playbook
(https://playbook.agentskit.io/llms-full.txt). A 2026-06-03 audit closed the
main gaps. Conforms: typed error hierarchy (`AgentsKitError`), zero-dep core,
ADR/RFC registries, changesets, structural gates, runtime arg validation
(ADR-0008), in-repo agent memory, threat model, product brief/surfaces.

**Intentional adaptations (not deviations):**
- **JSON Schema, not Zod**, as the canonical contract — see
  [[feedback_json-schema-canonical]]. Playbook wording says Zod; we honour its
  *intent* (typed boundaries + single source) without a second schema system.
- **Locale parity = MDX sibling routes**, not JSON key catalogs — docs i18n is
  page-based (`apps/docs-next/lib/locales.ts`), so `check-intl-parity` enforces
  page coverage for `full` locales rather than key sets.
- **Operate-phase artifacts** (audit ledger, key-rotation calendar, runbooks)
  are library-inappropriate at this stage; threat model flags them for the
  hosted/app surface when it lands.

**How to apply:** Before "fixing" a perceived playbook gap, check whether it's a
deliberate adaptation recorded here or in an ADR. Code + ADRs win over playbook
literal wording.

**Related:** [[feedback_zero-dep-core]], [[reference_quality-gates]]
