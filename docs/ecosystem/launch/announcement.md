# Community announcement (draft — HITL required)

> **Do not post publicly until:**
>
> 1. Ecosystem readiness overall status is `ready` (`pnpm check:ecosystem-readiness`)
> 2. HITL fields in `launch-package.json` are approved (`publicPackageApproved` + `launchTimingApproved`)

## Short

AgentsKit is one ecosystem for building, starting, shipping, guiding, reviewing, and operating AI agents in JavaScript/TypeScript.

- Build with **AgentsKit**
- Start from the **Registry**
- Ship experiences with **AgentsKit Chat**
- Guide work with **Doc Bridge**
- Apply discipline with the **Playbook**
- Verify with **Code Review**
- Operate on **AgentsKit OS**

Numbers in public posts must come from `ecosystem-claims.json` (generated), not from memory.

## Medium

If you are tired of gluing libraries into a fragile agent stack, start here:

```bash
npm install @agentskit/core @agentskit/runtime tsx
# use the verified first-agent fixture from the docs
npx tsx agent.ts
```

Then pick the next product for your path — ready agents, chat surfaces, documentation handoffs, review, or production operations.

Contribute: good first issues, docs fixes, adapters, tools, recipes, and showcases are welcome. Every public repository lists setup, tests, and conduct expectations.

## Long

See the living newcomer journey:

- Campaign landing: https://www.agentskit.io/community
- Docs journey: https://www.agentskit.io/docs/reference/contribute/newcomer-journey
- Readiness gate: https://github.com/AgentsKit-io/agentskit/blob/main/docs/ecosystem/readiness.md

## FAQ objections (approved talking points)

| Objection | Response |
|---|---|
| Lock-in | Packages are modular; adapters and tools are swappable contracts. |
| Providers | Bring your own model/provider through adapters; no single-vendor requirement. |
| Cost | Local-first demos run without keys; production cost is provider + your policy. |
| Maturity | Trust `ecosystem.json` maturity labels and STABILITY.md — never oversell alpha as stable. |
| Security | Confirmation, sandbox, and audit paths exist where claimed; secrets stay out of client bundles. |
| Self-hosting | Hosted-by-default docs chat and self-hostable protocol seams are product-specific — cite the relevant docs. |

## Metrics to report after launch

Track understanding, activation, use, contribution, and retention as defined in `launch-package.json` → `metrics`. Do not report vanity counts without sources.
