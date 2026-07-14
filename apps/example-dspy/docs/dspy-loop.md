# DSPy optimization loop for AgentsKit prompts

The four steps below are how `prompts/optimized.txt` was produced from `prompts/baseline.txt`. The JavaScript showcase replays the result so the regression gate stays deterministic in CI.

## 1. Collect traces

Run the baseline prompt against your existing eval set with `@agentskit/observability` enabled. Each run produces a trace tree with the model call inputs, tool-call args, and final response. Persist them to a JSONL file (`traces.jsonl`).

```ts
import { runBraintrustEval, ALL_SCORERS } from '@agentskit/eval/braintrust'
import { langfuse } from '@agentskit/observability/langfuse'

await runBraintrustEval({
  cases,
  agent: makeBaselineAgent({ observers: [langfuse()] }),
  scorers: ALL_SCORERS,
  options: { projectName: 'agentskit-baseline' },
})
```

## 2. Bootstrap a DSPy dataset

Convert the JSONL trace into DSPy `Example` objects. Each example is `{ question, answer_with_citations }`, derived from the trace's user input and the cited final answer.

```python
import dspy
from agentskit_dspy.io import iter_jsonl

trainset = [
    dspy.Example(question=row["input"], answer_with_citations=row["output"]).with_inputs("question")
    for row in iter_jsonl("traces.jsonl")
]
```

## 3. Compile

Use one of DSPy's teleprompters. `BootstrapFewShot` is enough for a tool-calling agent; `MIPROv2` if you want richer prompt search.

```python
from dspy.teleprompt import BootstrapFewShot

def metric(gold, pred, trace=None):
    return gold.answer_with_citations.lower() in pred.answer_with_citations.lower()

compiled = BootstrapFewShot(metric=metric).compile(ToolCallingProgram(), trainset=trainset)
print(compiled.respond.signature.instructions)
```

Save the compiled `instructions` string to `prompts/optimized.txt`.

## 4. Re-evaluate

Run the optimized prompt against the held-out portion of the dataset. Use the same scorers; expect quality scorers to climb and robustness scorers (HITL, schema validity, citations) to climb the most because DSPy bakes the protocol into the instruction itself.

```sh
pnpm --filter @agentskit/example-dspy start
```

The Δ column in the printed table is what you commit to the PR.

## DPO follow-up (optional)

Once the optimized prompt is settled, the same trace store gives you preference pairs:

```python
preferences = [
    {"prompt": p, "chosen": better, "rejected": worse}
    for p, better, worse in find_preference_pairs(traces)
]
```

Feed those to a DPO trainer (TRL on Hugging Face). Re-run the eval table; if quality climbs without a robustness drop, ship the new model.

## Why we ship a JS replay instead of running DSPy in CI

DSPy is Python and needs a model. Running it on every PR would be slow, flaky, and expensive. Compiling offline and shipping the resulting prompt artifact is the same pattern AgentsKit uses for any other compiled asset — deterministic input → deterministic test.
