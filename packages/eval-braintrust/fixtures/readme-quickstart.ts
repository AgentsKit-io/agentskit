import {
  runBraintrustEval,
  qualityFamily,
  robustnessFamily,
} from '@agentskit/eval/braintrust'

const myAgent = {
  async run(input: string) {
    return { text: `Answer for: ${input}`, toolCalls: [] }
  },
}

const result = await runBraintrustEval({
  cases: [
    { input: 'What is the capital of France?', output: '', expected: 'Paris' },
  ],
  agent: async input => {
    const r = await myAgent.run(input)
    return { output: r.text, metadata: { toolCalls: r.toolCalls } }
  },
  scorers: [...qualityFamily.scorers, ...robustnessFamily.scorers],
  options: {
    projectName: 'agentskit-showcase',
    experimentName: `pr-${process.env.GITHUB_PR_NUMBER ?? 'local'}`,
  },
})

console.log(result.summary)
console.log(result.url) // public Braintrust experiment URL
