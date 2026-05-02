---
'@agentskit/templates': minor
---

feat(templates): `flow` scaffold type — closes K/P1.

`scaffold({ type: 'flow', name, dir })` now emits:

- `flow.yaml` — starter `FlowDefinition` with two demo nodes
  (`fetch` → `parse`) showing the `name`, `version`, `nodes`,
  `needs` shape.
- `src/index.ts` — `FlowRegistry` skeleton with `http.get` +
  `json.parse` handler stubs typed against the runtime contract.
- `tests/index.test.ts` — minimal smoke test that imports the
  registry and runs `compileFlow` to assert the shape.
- `README.md` — `agentskit flow validate / render / run` quick
  reference + the programmatic `compileFlow` snippet, deep-linked
  to `/docs/agents/flow`.

Companion to the memory blueprint added in #734. `ScaffoldType` now
covers `tool` | `skill` | `adapter` | `memory-vector` |
`memory-chat` | `flow`.
