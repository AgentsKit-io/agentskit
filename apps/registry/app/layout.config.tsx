import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-display text-sm font-semibold tracking-tight text-ak-foam">AgentsKit Registry</span>
    ),
    url: '/',
  },
  links: [
    { text: 'Agents', url: '/', active: 'none' },
    { text: 'Using', url: '/docs/using' },
    { text: 'Create an agent', url: '/docs/authoring' },
    { text: 'Contributing', url: '/docs/contributing' },
    { text: 'Framework', url: 'https://www.agentskit.io', external: true },
  ],
  githubUrl: 'https://github.com/AgentsKit-io/agentskit-registry',
}
