# @agentskit/example-flow

Live demo of `compileFlow` from `@agentskit/runtime`: a YAML
`FlowDefinition` is compiled into a durable DAG, executed with a
JSONL step log, and prints a rendered markdown summary.

The flow pulls stargazer counts for two GitHub repos in parallel,
sums them, and renders a digest:

```
▸ flow=octo-stars-digest runId=demo-run
  order=fetch-react → fetch-vue → total → render
▸ fetch-react start
  ★ facebook/react → 235,492
✓ fetch-react done
▸ fetch-vue start
  ★ vuejs/core → 50,876
✓ fetch-vue done
▸ total start
✓ total done
▸ render start
✓ render done

— done in 412ms —

# Stargazers digest

- **facebook/react** — 235,492 ★ (node `fetch-react`)
- **vuejs/core** — 50,876 ★ (node `fetch-vue`)

_Total across the listed repos: **286,368** ★_
```

## Run

```bash
pnpm --filter @agentskit/example-flow dev
```

Re-running with the same `RUN_ID` short-circuits any node already
recorded as successful in `.agentskit/flow.jsonl` — try killing the
process mid-run and re-launching:

```bash
RUN_ID=resume-test pnpm --filter @agentskit/example-flow dev
# Ctrl-C during one of the github.stars nodes, then:
RUN_ID=resume-test pnpm --filter @agentskit/example-flow dev
```

The replayed steps print no `start` / `done` events; only the
unfinished node and downstream nodes execute.

## Reset the durable log

```bash
pnpm --filter @agentskit/example-flow dev -- --reset
```

## Auth

GitHub's anonymous API has a strict rate limit. Set `GITHUB_TOKEN`
to a personal access token with `public_repo` (or any scope) to
raise the cap:

```bash
GITHUB_TOKEN=ghp_xxx pnpm --filter @agentskit/example-flow dev
```

## See also

- [`/docs/agents/flow`](https://www.agentskit.io/docs/agents/flow) — the user-facing guide.
- [`/docs/agents/durable`](https://www.agentskit.io/docs/agents/durable) — durable runner internals.
- `apps/example-runtime` — same runtime, plain ReAct loop.
