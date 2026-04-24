// Server-safe metadata. No React imports here so both server and client can consume.
export type ShowcaseMeta = {
  slug: string
  name: string
  description: string
  tags: string[]
  /** Matches a file under components/examples/<module>.tsx */
  module: string
}

export const SHOWCASE: ShowcaseMeta[] = [
  { slug: 'basic-chat', name: 'Basic chat', description: 'Streaming chat with a mock adapter. Zero config, runs in-browser.', tags: ['streaming', 'chat'], module: 'BasicChat' },
  { slug: 'tool-use', name: 'Tool use', description: 'Tool-calling agent that browses a mocked product catalog.', tags: ['tools', 'chat'], module: 'ToolUseChat' },
  { slug: 'rag', name: 'RAG', description: 'Retrieval-augmented chat with inline source citations.', tags: ['rag', 'chat'], module: 'RAGChat' },
  { slug: 'code-assistant', name: 'Code assistant', description: 'Code-aware chat with syntax-highlighted output.', tags: ['code', 'chat'], module: 'CodeAssistant' },
  { slug: 'markdown', name: 'Markdown chat', description: 'Rich Markdown rendering in assistant responses.', tags: ['markdown', 'chat'], module: 'MarkdownChat' },
  { slug: 'support-bot', name: 'Support bot', description: 'Chat with escalation, memory, and confirmation gates.', tags: ['support', 'memory', 'tools'], module: 'SupportBot' },
  { slug: 'multi-agent', name: 'Multi-agent', description: 'Planner + worker + reviewer topology.', tags: ['multi-agent'], module: 'MultiAgentChat' },
  { slug: 'multi-model', name: 'Multi-model', description: 'Switch providers on the fly in a single conversation.', tags: ['multi-model', 'chat'], module: 'MultiModelChat' },
  { slug: 'agent-actions', name: 'Agent actions', description: 'Streaming UI with live tool-call visualization.', tags: ['tools', 'streaming'], module: 'AgentActions' },
  { slug: 'shadcn', name: 'shadcn/ui chat', description: 'AgentsKit styled with shadcn/ui tokens.', tags: ['chat', 'design-system'], module: 'ShadcnChat' },
  { slug: 'mui', name: 'Material UI chat', description: 'AgentsKit styled with MUI components.', tags: ['chat', 'design-system'], module: 'MuiChat' },
]

export const ALL_TAGS: string[] = Array.from(new Set(SHOWCASE.flatMap((s) => s.tags))).sort()

export function findShowcase(slug: string): ShowcaseMeta | undefined {
  return SHOWCASE.find((s) => s.slug === slug)
}
