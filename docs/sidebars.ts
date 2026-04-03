import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/for-ai-agents',
      ],
    },
    {
      type: 'category',
      label: 'Core Hooks',
      items: [
        'hooks/use-stream',
        'hooks/use-reactive',
        'hooks/use-chat',
      ],
    },
    {
      type: 'category',
      label: 'Components',
      items: ['components/overview'],
    },
    {
      type: 'category',
      label: 'Adapters',
      items: ['adapters/overview'],
    },
    {
      type: 'category',
      label: 'Theming',
      items: ['theming/overview'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/index',
        'examples/basic-chat',
        'examples/tool-use',
        'examples/multi-model',
        'examples/code-assistant',
        'examples/support-bot',
        'examples/rag-chat',
        'examples/agent-actions',
        'examples/markdown-chat',
        'examples/mui-chat',
        'examples/shadcn-chat',
      ],
    },
  ],
}

export default sidebars
