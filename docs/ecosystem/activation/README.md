# AgentsKit activation recipes

Draft documentation for the first-result journey. This directory is content-only: it does not change runtime APIs, provider contracts, adapters, protocols, Registry agents, or publication state.

The companion activation kit validates the commands offline and against published packages. Keep this page advisory until the catalog has passed human review and the Grok clarity/deduplication pass.

## Recommended path

Start with the zero-key result and explicitly cross a second component at each CTA:

| Priority | Recipe | Components | First observable result | Next CTA | Metric |
|---|---|---|---|---|---|
| R0 | First result without a key | AgentsKit + Chat | `Agent ready.` and the task echoed | Open the Chat starter | `time_to_first_result` |
| R0 | Registry agent in Chat | Registry + AgentsKit + Chat | `research` agent runs with the Chat renderer | Resolve the docs-first question | `second_component_completion` |
| R0 | Docs-first local Chat | Playbook + Chat + Doc Bridge | verified local answer with a source path | Resolve the handoff | `deterministic_answer_rate` |
| R0 | Handoff before editing | Doc Bridge + Playbook | `startHere`, `editRoots`, and checks | Run advisory review | `handoff_resolution_rate` |
| R0 | Review before merge | Code Review + Playbook + Doc Bridge | advisory findings and a separate gate | Add cited retrieval | `review_completion_rate` |
| R1 | Cited document answer | AgentsKit + Chat + Doc Bridge | answer with a valid source ID | Compare adapters | `citation_coverage` |
| R1 | Provider swap evaluation | AgentsKit + Playbook + Code Review | both adapters preserve fixture invariants | Run bounded agent | `provider_swap_pass_rate` |
| R1 | Sandboxed code agent | AgentsKit + Registry + Code Review | bounded run, cleanup, and review result | Return to zero-key start | `sandboxed_run_success` |

## Zero-key first result

```bash
npm install @agentskit/core @agentskit/runtime tsx
cp apps/docs-next/fixtures/first-agent/agent.ts ./agent.ts
npx tsx agent.ts
```

Expected output includes:

```text
Agent ready. I received: Plan my first production agent
```

Continue with the published Chat CLI:

```bash
npx @agentskit/chat-cli init ./chat-app --renderer react --yes
```

The Chat path is a second component, not a separate product campaign. The same task should remain visible in the generated UI.

## Component handoffs

### Registry to Chat

```bash
npx agentskit add research
```

Run the copied source-owned agent with a local adapter or cassette, then keep the Chat renderer unchanged. A provider key is optional for the fixture path.

### Docs-first Chat and handoff

```bash
npx ak-docs demo --text
npx agents-playbook list
npx agents-playbook run no-any named-exports --cwd "$PWD"
```

The result must expose a source path, edit root, checks, and an explicit unresolved path for questions that are not in the deterministic fixture.

### Review before merge

```bash
npx @agentskit/code-review --help
```

For a real local review, use a provider already configured by the operator, keep `--no-fail`, limit files, and preserve advisory output. The recipe never comments on a PR, merges, publishes, or changes the ledger.

## Quality gates

- Every recipe has at least two named components.
- Every recipe has a copy/paste command, expected output, CTA, and metric.
- Offline fixtures run without credentials.
- Real provider checks are opt-in and bounded; Ollama is not required for the zero-key path.
- Analytics may record only recipe identity, component, CTA, duration, and safe error codes.
- Grok suggestions remain advisory; deterministic checks and human review retain authority.

## Status

This is a local draft integration. No release, listing, PR, publication, approval, or ledger write is performed by this document.
