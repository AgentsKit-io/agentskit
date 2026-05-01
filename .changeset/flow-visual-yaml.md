---
'@agentskit/runtime': minor
'@agentskit/cli': minor
---

feat(flow): visual YAML editor + durable DAG compiler (#197)

`FlowDefinition` describes a directed acyclic graph of named nodes; each
node calls a handler from a `FlowRegistry` and lists upstream `needs`.

Runtime additions:

- `compileFlow({ definition, registry })` — validates the graph
  (duplicate ids, missing handlers, unknown deps, cycles, self-deps),
  picks a topological order, and returns `{ run(input, opts) }`.
- Every node executes through `createDurableRunner` under the step id
  `node:<id>`, so a flow with `{ runId, store }` resumes from the last
  successful node after a crash or a deploy.
- `validateFlow(definition, registry?)` and `flowToMermaid(definition)`
  are exported for editors and tooling.

CLI additions — `agentskit flow`:

- `validate <file> [--registry <module>]` reports issues with file
  position-free, code-tagged messages.
- `render <file>` emits a Mermaid `flowchart TD` (same string the
  visual editor's preview pane consumes).
- `run <file> --registry <module> [--store <path>] [--run-id <id>]`
  compiles and executes; `--store` persists the durable step log as
  JSONL and `--run-id` resumes a previous attempt.

Both YAML and JSON flow files are accepted. Schema is deliberately
narrow — no conditionals or expressions; branching belongs in a handler.
