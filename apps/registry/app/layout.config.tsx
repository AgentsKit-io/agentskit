import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-display text-sm font-semibold tracking-tight text-ak-foam">AgentsKit Registry</span>
    ),
    url: '/',
  },
  links: [
    { text: 'Agents', url: '/agents', active: 'nested-url' },
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'llms.txt', url: '/llms.txt', active: 'none' },
    { text: 'Framework', url: 'https://www.agentskit.io', external: true },
  ],
  githubUrl: 'https://github.com/AgentsKit-io/agentskit-registry',
}
