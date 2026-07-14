# Content pipeline (Ecosystem 16)

Issue: [#1206](https://github.com/AgentsKit-io/agentskit/issues/1206)  
Parent: [#1198](https://github.com/AgentsKit-io/agentskit/issues/1198)

Human-approved content atom pipeline that dogfoods AgentsKit + Registry contracts:

| Role | Registry agent | Offline behavior |
|---|---|---|
| recipe-miner | (local) | Scans committed recipe JSON |
| claim-verifier | `content-fact-checker` | Verifies `ecosystem-claims.json` |
| content-repurposer | `content-repurpose-matrix` | Deterministic platform variants |
| visual-storyboarder | `content-youtube-metadata` | Carousel/GIF storyboard draft |
| ecosystem-linker | `content-internal-link-planner` | Links from `ecosystem.json` only |
| post-reviewer | `content-style-guide-enforcer` | Checklist + requires human |
| publisher | policy-gated | Packages drafts only after `APPROVAL.json` |

**Never auto-publishes** to social networks. `APPROVAL.json` must set `approved: true` with `approvedBy` / `approvedOn` before `ready-for-human-publish`.

## Commands

```bash
# Generate / refresh the first-agent atom (runs executable demo)
pnpm content-pipeline:run

# Structural audit (CI)
pnpm check:content-pipeline

# Tests
pnpm test:content-pipeline
```

## First atom

`atoms/first-agent/` is produced from `recipes/first-agent.json` and the committed fixture
`apps/docs-next/fixtures/first-agent/agent.ts`.

Variants:

- `docs.mdx` — documentation draft
- `example.json` — executable fixture link
- `social-short.md` — short post
- `social-thread.md` — thread
- `carousel-storyboard.md` — visual storyboard
- `community-post.md` — community post draft
- `review.md` — review checklist
- `APPROVAL.json` — human gate (starts false)

## Required external gates before expanding the pipeline

1. Doc Bridge — `pnpm docs:bridge:gate` for docs PRs  
2. Playbook — production content standards  
3. Code Review — review implementation diffs  
