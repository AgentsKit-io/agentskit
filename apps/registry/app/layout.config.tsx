import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { productLayout } from '@/components/product-layout'

export const baseOptions: BaseLayoutProps = productLayout({
  name: 'AgentsKit Registry',
  links: [
    { text: 'Agents', url: '/agents', active: 'nested-url' },
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'llms.txt', url: '/llms.txt', active: 'none' },
    { text: 'AgentsKit', url: 'https://www.agentskit.io', external: true },
  ],
  githubUrl: 'https://github.com/AgentsKit-io/agentskit-registry',
})
