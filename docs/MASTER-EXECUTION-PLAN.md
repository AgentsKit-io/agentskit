# AgentsKit — Master Execution Plan

> Master execution plan for the 149 issues (Phase 0 + Phases 1–4).
> Sequence, dependencies, sprints, gates, and suggested order.
>
> **Related documents:**
> - [Master PRD #113](https://github.com/EmersonBraun/agentskit/issues/113) — 97 product roadmap issues
> - [Phase 0 PRD #211](https://github.com/EmersonBraun/agentskit/issues/211) — 52 foundation-hardening issues
> - [`PHASE-0-EXECUTION-PLAN.md`](./PHASE-0-EXECUTION-PLAN.md) — detailed P0→P2 plan
> - [Project Board](https://github.com/users/EmersonBraun/projects/1)

---

## Overview

| Period | Phase | Issues | Goal |
|---|---|---|---|
| **Weeks 1–6** | **Phase 0** (Foundation) | 52 (#212–#263) | Solid base: contracts, narrative, Fumadocs, agentskit.io, quality |
| **Months 2–4** | **Phase 1** (Foundation UX) | 20 (#114–#133) | DX that goes viral — init, doctor, dev, devtools, recipes |
| **Months 4–7** | **Phase 2** (Evolution) | 31 (#134–#164) | Real technical differentiation — replay, router, memory, security |
| **Months 7–10** | **Phase 3** (Expansion) | 34 (#165–#198) | Adapters, tools, MCP bridge, multi-framework, verticals |
| **Months 10–12** | **Phase 4** (Business) | 12 (#199–#210) | Cloud, marketplace, enterprise, partnerships |

**Total**: ~12 months of a clear roadmap. Mandatory quarterly review to recalibrate.

---

## Sprint structure

Sprints of **2 weeks**. Over 12 months, ~26 sprints.

### Phase → Sprint → Issue mapping

| Sprint | Weeks | Phase | Focus | Target issues |
|---|---|---|---|---|
| **S1** | 1–2 | Phase 0 | Narrative + CI gates | P0: #225, #226, #235, #217, #218, #224 |
| **S2** | 3–4 | Phase 0 | Contracts + Fumadocs start | P0/P1: #214, #225→#238 (Fumadocs spike) |
| **S3** | 5–6 | Phase 0 | Full Fumadocs + Concepts + package READMEs | P1/P2: #238, #239, #228, READMEs |
| **S4** | 7–8 | Phase 0 wrap | Migration guides + E2E + Discord + LICENSE | #241, #242, #243, #255, #261 |
| **S5** | 9–10 | **🚀 Launch + start of Phase 1** | Coordinated announcement + init/doctor | #263 (launch) + #114 #115 #116 |
| **S6** | 11–12 | Phase 1 | Dev server + tunnel + streaming | #117 #118 #121 |
| **S7** | 13–14 | Phase 1 | useChat + cost guard + hot-swap | #119 #120 #121 #122 #123 |
| **S8** | 15–16 | Phase 1 | Docs chat + decision tree + migration guides | #124 #125 #126 #127 #128 |
| **S9** | 17–18 | Phase 1 wrap | Didactic errors + types + public roadmap | #129 #130 #131 #132 #133 |
| **S10** | 19–20 | Phase 2 | Deterministic replay + snapshot + diff | #134 #135 #136 |
| **S11** | 21–22 | Phase 2 | Time travel + token budget + speculative | #137 #138 #139 |
| **S12** | 23–24 | Phase 2 | Progressive streaming + context + multi-modal | #140 #141 #142 |
| **S13** | 25–26 | Phase 2 | Schema-first + agentskit ai + router adapter | #143 #144 #145 |
| **S14** | 27–28 | Phase 2 | Ensemble + fallback + devtools | #146 #147 #148 |
| **S15** | 29–30 | Phase 2 | Trace viewer + evals CI + A/B | #149 #150 #151 |
| **S16** | 31–32 | Phase 2 | Hierarchical memory + summarization + RAG reranking | #152 #153 #154 #155 |
| **S17** | 33–34 | Phase 2 wrap | Durable + multi-agent + HITL + background | #156 #157 #158 #159 |
| **S18** | 35–36 | Phase 2 security | PII + prompt injection + audit + rate-limit + sandbox | #160 #161 #162 #163 #164 |
| **S19** | 37–38 | Phase 3 | Major adapters (10+ providers) | #165 #166 |
| **S20** | 39–40 | Phase 3 | MCP bridge + tool composer | #167 #168 |
| **S21** | 41–42 | Phase 3 | Dev ecosystem tools (GitHub, Linear, Slack) | #169 #170 #171 |
| **S22** | 43–44 | Phase 3 | Scraping/image/voice/maps tools | #172 #173 #174 #175 |
| **S23** | 45–46 | Phase 3 | Browser agent + self-debug + memory adapters | #176 #177 #178 |
| **S24** | 47–48 | Phase 3 | Memory graph + encryption + skills | #179 #180 #181 #182 #183 |
| **S25** | 49–50 | Phase 3 | Multi-framework UI (Vue/Svelte/Solid) + RN | #184 #185 #186 |
| **S26** | 51–52 | Phase 3 wrap | Edge + Browser-only + verticals + A2A | #187 #188 #189 #190 #191 #192 #193 #194 #195 #196 #197 #198 |
| **S27+** | 53+ | **Phase 4** | Cloud, marketplace, enterprise | #199–#210 |

> Note: assumed capacity = **1–2 devs**. With more people, compress sprints.

---

## Critical dependencies

### Before anything in Phase 1
- ✅ Contract ADRs (#214) completed
- ✅ Bundle/coverage gates (#217 #218) active
- ✅ agentskit.io live (#235)
- ✅ Fumadocs migrated (#238)
- ✅ README + Manifesto + Origin (#224 #225 #226) published
- ✅ E2E Playwright on the examples (#251)

### Feature-to-feature dependencies

```
#3 Contract ADRs ─────┬──> all of Phase 1 (needs a stable contract)
                       └──> all of Phase 3 (new adapters/tools)

#54 MCP bridge (P3) ──> #31 agentskit ai (P2) — needs MCP tools
#21 Deterministic replay (P2) ──> #39 Session replay + #43 Test fixtures
#77 AgentsKit Edge (P3) ──> #86 Cloud free tier (P4) — edge runtime
#69 Skill marketplace (P3) ──> #91 Revenue share (P4)
#81 A2A Protocol (P3) ──> strategic partnerships (P4)
```

### Capacity warnings
- **S16–S18** (memory + security + durability) are **heavy** — consider 3 sprints instead of 2
- **S19 major adapters** requires API keys for 10+ providers — line up budget/credentials first
- **S20 MCP bridge** is architecturally heavy — allocate a senior dev

---

## Gates per phase (do not skip)

### Gate Phase 0 → Phase 1
- [ ] 6 core ADRs merged
- [ ] Bundle/coverage gates blocking PRs
- [ ] agentskit.io resolving + docs.agentskit.io live
- [ ] Root README rewritten + Manifesto + Origin published
- [ ] Fumadocs with Concepts section + ≥5 recipes
- [ ] LangChain + Vercel AI migration guides published
- [ ] E2E Playwright running on the 4 examples
- [ ] Discord with ≥20 members + CODEOWNERS active
- [ ] LICENSING.md decided
- [ ] **Coordinated launch executed** (HN/Twitter/PH/Reddit)

### Gate Phase 1 → Phase 2
- [ ] 20 Phase 1 stories done or explicitly de-scoped
- [ ] `npx @agentskit/cli init` at ≥1000 downloads/month
- [ ] Discord with ≥200 members
- [ ] ≥3 external users sharing projects publicly

### Gate Phase 2 → Phase 3
- [ ] Deterministic replay + devtools working (real technical differentiation)
- [ ] Full security layer
- [ ] Hierarchical memory + RAG reranking shipped
- [ ] ≥10 stars/week of consistent growth
- [ ] 1+ case study published

### Gate Phase 3 → Phase 4
- [ ] 10+ stable adapters
- [ ] Bidirectional MCP bridge functional
- [ ] ≥1 strategic partnership announced (Vercel, Cloudflare, provider)
- [ ] User base ≥5k DAU

---

## Cadence & ceremonies

### Daily
- Status update in Discord `#maintainers` (2 lines — done/doing/blocked)

### Weekly — every Friday at 5pm
- **Sprint Review** (30 min): demo what shipped
- **Planning** for next week (30 min): adjust priorities

### Bi-weekly — end of each sprint
- **Retro** (30 min): what worked, what didn't, what to change
- Update the Project board: move completed, re-estimate pending

### Monthly
- **Community update** — blog post / newsletter
- **Full roadmap review** — does any phase need recalibrating?

### Quarterly
- **Public roadmap review** — RFC of adjustments
- **Metrics eval** — stars, downloads, Discord, contributors

---

## Success metrics

### Phase 0 (3 months)
- agentskit.io indexed on Google
- Coordinated launch with ≥1000 visits in the week
- ≥500 stars on the repo
- ≥20 Discord members

### Phase 1 (end of month 4)
- ≥1000 npm downloads/month
- ≥200 Discord members
- ≥5 external contributors with merged PRs

### Phase 2 (end of month 7)
- ≥5000 downloads/month
- ≥1 Hacker News front-page post
- Coverage in ≥3 tech newsletters (Node Weekly, JS Weekly, etc.)

### Phase 3 (end of month 10)
- ≥20k downloads/month
- 10+ mature adapters
- ≥10 public open-source projects using AgentsKit

### Phase 4 (end of year 1)
- Cloud with ≥100 active users
- First enterprise customer
- Break-even on infra cost

---

## Project Board — recommended configuration

Add an **Iteration** field (sprint tracker) with:
- Sprints S1 through S27 as options
- Pre-filled for the next 2–3 iterations

Create **Views**:
1. **🔥 Current Sprint** — filter: `iteration = current`, group by Status
2. **📅 Roadmap Timeline** — layout: Roadmap, group by Phase
3. **🎯 By Priority** — filter: `iteration = current or next`, group by Priority
4. **🧭 Backlog Planning** — filter: `iteration is empty`, group by Phase
5. **📦 By Package** — group by Category/Package

---

## Concrete next actions (start today)

### This week (Sprint 1 start)
1. **Create branch `foundation/manifesto-origin`** — draft MANIFESTO.md + ORIGIN.md
2. **Buy DNS service + Cloudflare for agentskit.io** — point a provisional `CNAME`
3. **Set up `size-limit` on a test package** (core) — validate the flow before replicating
4. **Create issue/PR templates in `.github/`** — unblocks everything that follows
5. **Decide the new docs host**: Vercel vs Cloudflare Pages (we recommend Vercel for the Fumadocs/Next.js integration)

### Next week
1. Finalize MANIFESTO + ORIGIN in an approved PR
2. Start the root README rewrite (block by block)
3. Spike Fumadocs in a separate branch
4. Open the first ADR (`0001-adapter-contract.md`) as a public RFC

### Week 3
1. Parity check Docusaurus vs Fumadocs
2. Continue ADRs (target: 1/day)
3. CODEOWNERS + issue templates merged
4. Activate bundle/coverage gates on main

---

## Execution principles

1. **Done is better than perfect** — accept v0.1 of things and iterate
2. **Publish in public** — RFCs, ADRs, decisions all open
3. **Aggressive time-boxing** — every task has a limit; if it overruns, re-evaluate
4. **Move at least 1 issue every day** — momentum matters
5. **Never start a phase with the previous one incomplete** — gates exist for a reason
6. **Dogfood** — AgentsKit should be used to build AgentsKit (docs chat, release agent, etc.)
