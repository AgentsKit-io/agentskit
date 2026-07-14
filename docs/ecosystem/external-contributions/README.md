# Utility-first external contributions

Issue: [#1207](https://github.com/AgentsKit-io/agentskit/issues/1207)  
Parent: [#1198](https://github.com/AgentsKit-io/agentskit/issues/1198)

This program proves a workflow for **useful** external contributions — not link spam.

## Policy (non-negotiable)

1. Real technical relationship to AgentsKit  
2. Published contribution rules for the target  
3. Contribution remains useful if promotional copy is removed  
4. Human approval before external submission  
5. Named maintenance ownership when accepted  
6. No mass submissions  

## Commands

```bash
pnpm check:external-contributions
pnpm test:external-contributions
```

## Layout

| Path | Purpose |
|---|---|
| `program.json` | Policy + metrics |
| `targets/index.json` | Curated targets (including rejected promotional lists) |
| `fixtures/sample-cli` | Offline target used to prove the workflow |
| `contributions/*` | Prepared packages with proposal, utility check, evidence, approval |

## Worked examples

1. **sample-cli-version-flag** — fixture target proof with tests  
2. **ollama-openai-compat-smoke** — real-world draft for HITL (standalone OpenAI-compat smoke script)

## Metrics we track

- accepted utility  
- qualified adoption  
- rejection learning  

We do **not** treat impressions or raw link counts as success.
