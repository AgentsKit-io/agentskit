import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { researcher, coder, composeSkills } from '@agentskit/skills'
import { webSearch, filesystem } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  tools: [webSearch(), ...filesystem({ basePath: './workspace' })],
})

const result = await runtime.run('Research best practices for TypeScript error handling and write an example', {
  skill: composeSkills(researcher, coder),
})
console.log(result.content)
