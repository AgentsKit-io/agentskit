# @agentskit/example-runtime

Headless runtime demos. No UI, no provider keys — every adapter is
mocked so the scripts run anywhere.

| Script | What it shows | Source |
|---|---|---|
| `pnpm dev` | Basic ReAct loop with one tool call | [`src/index.ts`](./src/index.ts) |
| `pnpm dev:speculate` | Race two adapters; loser is aborted as soon as the winner settles | [`src/speculate.ts`](./src/speculate.ts) |
| `pnpm dev:durable` | Step log: re-running short-circuits successful prior steps | [`src/durable.ts`](./src/durable.ts) |
| `pnpm dev:topology` | Supervisor + swarm + blackboard topologies, three shapes back to back | [`src/topology.ts`](./src/topology.ts) |

Run any of them via the workspace filter:

```bash
pnpm --filter @agentskit/example-runtime dev
pnpm --filter @agentskit/example-runtime dev:speculate
pnpm --filter @agentskit/example-runtime dev:durable
pnpm --filter @agentskit/example-runtime dev:topology
```

## Durable demo: try the resume

```bash
# First run: each step takes ~800ms.
pnpm --filter @agentskit/example-runtime dev:durable

# Second run: every step replays instantly from the JSONL log.
pnpm --filter @agentskit/example-runtime dev:durable

# Wipe the log and start over:
pnpm --filter @agentskit/example-runtime dev:durable -- --reset
```

The log lives at `apps/example-runtime/.agentskit/durable.jsonl` and
is gitignored.

## Wiring real adapters

Every demo accepts the `AdapterFactory` shape. Swap the mocks for
`openai`, `anthropic`, `vercelAI`, etc., from `@agentskit/adapters`
and the rest of the code is unchanged. Topologies operate on
`AgentHandle`s, which `createRuntime({ adapter, … }).run` produces
when you adapt the result into one.

## See also

- [`/docs/agents/runtime`](https://www.agentskit.io/docs/agents/runtime)
- [`/docs/agents/topologies`](https://www.agentskit.io/docs/agents/topologies)
- [`/docs/agents/durable`](https://www.agentskit.io/docs/agents/durable)
- [`/docs/agents/speculate`](https://www.agentskit.io/docs/agents/speculate)
- [`apps/example-flow`](../example-flow) — the flow + durable runner counterpart.
