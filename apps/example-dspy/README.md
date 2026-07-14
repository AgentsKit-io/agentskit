# `@agentskit/example-dspy`

Showcase: **baseline prompt vs DSPy-optimized prompt**, scored side-by-side against the AgentsKit eval pipeline.

## Run it

```sh
pnpm --filter @agentskit/example-dspy start
```

You'll get a markdown table comparing the two prompt variants across the 8 bundled scorers (4 quality + 4 robustness).

## What this demonstrates

- A **baseline** ReAct-style prompt (in `prompts/baseline.txt`) — short, cheap, the kind of prompt you write on day one.
- A **DSPy-optimized** prompt (in `prompts/optimized.txt`) — the artifact you'd get after running a DSPy compile loop with the bundled `agentskit` traces as a bootstrap dataset.
- Both prompts drive the same simulated tool-calling agent in `src/agent.ts`. The agent reads "instruction signals" from the prompt (does it teach citations? schema-strict args? HITL?) and adjusts behavior accordingly.
- Scoring uses `@agentskit/eval/braintrust`'s `ALL_SCORERS`, so the report covers task success, factual grounding, citation correctness, tool-arg validity, schema survival, HITL gate correctness, fallback resilience, and no-crash survival.

## Optimization loop

The optimized prompt was produced offline with DSPy:

```python
import dspy
from dspy.teleprompt import BootstrapFewShot

class ToolCallingProgram(dspy.Module):
    def __init__(self):
        super().__init__()
        self.respond = dspy.Predict("question -> answer_with_citations")

teleprompter = BootstrapFewShot(metric=lambda gold, pred, _: gold.answer in pred.answer_with_citations)
compiled = teleprompter.compile(ToolCallingProgram(), trainset=load_agentskit_traces())
print(compiled.respond.signature.instructions)
```

The compiled instructions are checked into `prompts/optimized.txt`. We deliberately keep the JS showcase deterministic — no remote model call — so CI can run it on every PR and post the score delta.

See [`docs/dspy-loop.md`](./docs/dspy-loop.md) for the full collect-traces → bootstrap → compile → re-evaluate write-up.

## Optional: DPO follow-up

Once you have preference pairs (`(input, chosen, rejected)`) from the trace store, the same dataset can drive a DPO fine-tune. The eval table here is the regression gate.

## License

MIT (showcase only — not published).
