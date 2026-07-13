export { CATEGORY, categoryMeta, sortedCategories } from '@/lib/categories'

export function agentPrompt(a: { id: string; title: string; description: string }): string {
  return [
    `Install the "${a.title}" agent from the AgentsKit registry and wire it into this project.`,
    ``,
    `1. Run: npx agentskit add ${a.id}`,
    `2. It copies the source into ./agents/${a.id}/ (you own the code — shadcn-style).`,
    `3. Import the factory from ./agents/${a.id}/agent and construct it with an adapter`,
    `   (e.g. openai({ apiKey: process.env.OPENAI_API_KEY })).`,
    ``,
    `What it does: ${a.description}`,
    `Bundle (JSON): https://registry.agentskit.io/r/${a.id}.json`,
    `Docs: https://registry.agentskit.io/agents/${a.id}`,
  ].join('\n')
}
