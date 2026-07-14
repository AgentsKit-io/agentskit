# Content pipeline (Ecosystem 16)

Issue: [#1206](https://github.com/AgentsKit-io/agentskit/issues/1206)  
Parent: [#1198](https://github.com/AgentsKit-io/agentskit/issues/1198)

Human-approved content atom pipeline with deterministic local roles and explicit mappings to Registry agent contracts. The committed CI path does not pretend to invoke remote Registry agents; hosts may replace a compatible local role only after adding a real adapter-backed integration and tests.

| Role | Registry agent | Offline behavior |
|---|---|---|
| recipe-miner | (local) | Scans committed recipe JSON |
| claim-verifier | `content-fact-checker` | Verifies `ecosystem-claims.json` |
| content-repurposer | `content-repurpose-matrix` | Deterministic platform variants |
| visual-storyboarder | `content-youtube-metadata` | Carousel/GIF storyboard draft |
| ecosystem-linker | `content-internal-link-planner` | Links from `ecosystem.json` only |
| post-reviewer | `content-style-guide-enforcer` | Checklist + requires human |
| publisher | policy-gated | Packages drafts only after `APPROVAL.json` |

**Never auto-publishes** to social networks. Before `ready-for-human-publish`, `APPROVAL.json` must contain:

- `approved: true`, `approvedBy`, and `approvedOn`;
- the exact `contentDigest` emitted by the reviewed atom;
- evidence-backed `pass` attestations for the Playbook and Code Review gates;
- a complete review checklist and a successful executable verification.

Any content change invalidates the digest and requires a new approval.

## Commands

```bash
# Generate / refresh the first-agent atom (runs executable demo)
pnpm content-pipeline:run

# Full audit: executable recipe + Doc Bridge command gate
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

1. Doc Bridge — executed as `pnpm docs:bridge:gate` by the pipeline audit.
2. Playbook — evidence-backed human attestation in `APPROVAL.json`.
3. Code Review — evidence-backed human attestation in `APPROVAL.json`.

`--skip-exec` is a draft-generation convenience only: it records `ok: false`, leaves review incomplete, and can never produce a passing audit or publishable atom.
