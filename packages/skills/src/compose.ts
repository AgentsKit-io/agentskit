import type { SkillDefinition } from '@agentskit/core'

export function composeSkills(...skills: SkillDefinition[]): SkillDefinition {
  if (skills.length === 0) {
    throw new Error('composeSkills requires at least one skill')
  }

  if (skills.length === 1) {
    return skills[0]
  }

  const name = skills.map(s => s.name).join('+')
  const description = `Composed skill: ${skills.map(s => s.name).join(', ')}`

  const systemPrompt = skills
    .map(s => `--- ${s.name} ---\n${s.systemPrompt}`)
    .join('\n\n')

  const tools = [...new Set(skills.flatMap(s => s.tools ?? []))]
  const delegates = [...new Set(skills.flatMap(s => s.delegates ?? []))]
  const examples = skills.flatMap(s => s.examples ?? [])

  return {
    name,
    description,
    systemPrompt,
    tools: tools.length > 0 ? tools : undefined,
    delegates: delegates.length > 0 ? delegates : undefined,
    examples: examples.length > 0 ? examples : undefined,
    onActivate: skills.some(s => s.onActivate) ? async () => {
      const results = await Promise.all(
        skills.filter(s => s.onActivate).map(s => s.onActivate!())
      )
      const allTools = results.flatMap(r => r.tools ?? [])
      return { tools: allTools.length > 0 ? allTools : undefined }
    } : undefined,
  }
}
