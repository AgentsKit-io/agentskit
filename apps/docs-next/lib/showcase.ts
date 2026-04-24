// Server-safe metadata. No React imports here so both server and client can consume.

export type ShowcaseFramework =
  | 'react'
  | 'vue'
  | 'svelte'
  | 'solid'
  | 'angular'
  | 'react-native'
  | 'ink'
  | 'node'

export type FrameworkSource = {
  /** File path relative to the docs-next root — rendered as a Source tab. */
  file?: string
  /** Prebuilt StackBlitz template url — powers the "Run live" button. */
  stackblitz?: string
  /** Inline starter string if no file exists yet; useful for terse variants. */
  starter?: string
}

export type ShowcaseMeta = {
  slug: string
  name: string
  description: string
  tags: string[]
  /** React entry file name without extension — under components/examples/<module>.tsx. */
  module: string
  /**
   * Per-framework availability. React is always present via `module`; listing
   * another framework here shows its tab on the detail page. Missing frameworks
   * render a placeholder with a StackBlitz link.
   */
  sources?: Partial<Record<Exclude<ShowcaseFramework, 'react'>, FrameworkSource>>
}

const STACKBLITZ_TEMPLATES: Record<Exclude<ShowcaseFramework, 'react'>, string> = {
  vue: 'https://stackblitz.com/fork/vitejs-vite?file=src/App.vue&title=AgentsKit%20%C2%B7%20Vue',
  svelte: 'https://stackblitz.com/fork/vitejs-vite?template=svelte-ts&file=src/App.svelte&title=AgentsKit%20%C2%B7%20Svelte',
  solid: 'https://stackblitz.com/fork/solidjs?file=src/App.tsx&title=AgentsKit%20%C2%B7%20Solid',
  angular: 'https://stackblitz.com/fork/angular?file=src/app/app.component.ts&title=AgentsKit%20%C2%B7%20Angular',
  'react-native': 'https://snack.expo.dev/',
  ink: 'https://stackblitz.com/fork/node?file=index.tsx&title=AgentsKit%20%C2%B7%20Ink',
  node: 'https://stackblitz.com/fork/node?file=index.ts&title=AgentsKit%20%C2%B7%20Node',
}

export function stackblitzFor(framework: Exclude<ShowcaseFramework, 'react'>): string {
  return STACKBLITZ_TEMPLATES[framework]
}

export const SHOWCASE: ShowcaseMeta[] = [
  {
    slug: 'basic-chat',
    name: 'Basic chat',
    description: 'Streaming chat with a mock adapter. Zero config, runs in-browser.',
    tags: ['streaming', 'chat'],
    module: 'BasicChat',
    sources: {
      vue: { stackblitz: STACKBLITZ_TEMPLATES.vue },
      svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte },
      solid: { stackblitz: STACKBLITZ_TEMPLATES.solid },
      angular: { stackblitz: STACKBLITZ_TEMPLATES.angular },
      'react-native': { stackblitz: STACKBLITZ_TEMPLATES['react-native'] },
      ink: { stackblitz: STACKBLITZ_TEMPLATES.ink },
      node: { stackblitz: STACKBLITZ_TEMPLATES.node },
    },
  },
  { slug: 'tool-use', name: 'Tool use', description: 'Tool-calling agent that browses a mocked product catalog.', tags: ['tools', 'chat'], module: 'ToolUseChat', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte }, solid: { stackblitz: STACKBLITZ_TEMPLATES.solid }, node: { stackblitz: STACKBLITZ_TEMPLATES.node } } },
  { slug: 'rag', name: 'RAG', description: 'Retrieval-augmented chat with inline source citations.', tags: ['rag', 'chat'], module: 'RAGChat', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte }, node: { stackblitz: STACKBLITZ_TEMPLATES.node } } },
  { slug: 'code-assistant', name: 'Code assistant', description: 'Code-aware chat with syntax-highlighted output.', tags: ['code', 'chat'], module: 'CodeAssistant', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte } } },
  { slug: 'markdown', name: 'Markdown chat', description: 'Rich Markdown rendering in assistant responses.', tags: ['markdown', 'chat'], module: 'MarkdownChat', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte } } },
  { slug: 'support-bot', name: 'Support bot', description: 'Chat with escalation, memory, and confirmation gates.', tags: ['support', 'memory', 'tools'], module: 'SupportBot', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte } } },
  { slug: 'multi-agent', name: 'Multi-agent', description: 'Planner + worker + reviewer topology.', tags: ['multi-agent'], module: 'MultiAgentChat', sources: { node: { stackblitz: STACKBLITZ_TEMPLATES.node }, ink: { stackblitz: STACKBLITZ_TEMPLATES.ink } } },
  { slug: 'multi-model', name: 'Multi-model', description: 'Switch providers on the fly in a single conversation.', tags: ['multi-model', 'chat'], module: 'MultiModelChat', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte }, node: { stackblitz: STACKBLITZ_TEMPLATES.node } } },
  { slug: 'agent-actions', name: 'Agent actions', description: 'Streaming UI with live tool-call visualization.', tags: ['tools', 'streaming'], module: 'AgentActions', sources: { vue: { stackblitz: STACKBLITZ_TEMPLATES.vue }, svelte: { stackblitz: STACKBLITZ_TEMPLATES.svelte } } },
  { slug: 'shadcn', name: 'shadcn/ui chat', description: 'AgentsKit styled with shadcn/ui tokens.', tags: ['chat', 'design-system'], module: 'ShadcnChat' },
  { slug: 'mui', name: 'Material UI chat', description: 'AgentsKit styled with MUI components.', tags: ['chat', 'design-system'], module: 'MuiChat' },
]

export const ALL_TAGS: string[] = Array.from(new Set(SHOWCASE.flatMap((s) => s.tags))).sort()

export function findShowcase(slug: string): ShowcaseMeta | undefined {
  return SHOWCASE.find((s) => s.slug === slug)
}
