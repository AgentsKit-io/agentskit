import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { AnimatedLogo } from '@/components/brand/animated-logo'

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="flex items-center gap-2">
        <AnimatedLogo variant="nav" loop />
        <span className="font-mono font-bold tracking-tight">agentskit<span className="text-ak-graphite">.js</span></span>
      </span>
    ),
  },
  links: [
    { text: 'Documentation', url: '/docs' },
    { text: 'Examples', url: '/docs/examples' },
    { text: 'Contribute', url: '/docs/contribute' },
    { text: 'Discord', url: 'https://discord.gg/zx6z2p4jVb' },
    { text: 'GitHub', url: 'https://github.com/EmersonBraun/agentskit' },
    { text: 'Manifesto', url: 'https://github.com/EmersonBraun/agentskit/blob/main/MANIFESTO.md' },
  ],
  githubUrl: 'https://github.com/EmersonBraun/agentskit',
}
