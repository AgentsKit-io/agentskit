import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { AnimatedLogo } from '@/components/brand/animated-logo'

const DiscordIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-label="Discord"
    role="img"
    className="size-4"
  >
    <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.074.035c-.21.375-.445.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.07.07 0 0 0-.074-.034 19.736 19.736 0 0 0-4.885 1.515.064.064 0 0 0-.03.027C.533 9.045-.32 13.58.099 18.057a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027 14.21 14.21 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.29a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.197.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.04.106 16.05 16.05 0 0 0 1.225 1.993.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.177 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
  </svg>
)

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
    { text: 'For agents', url: '/docs/for-agents' },
    { text: 'Examples', url: '/docs/reference/examples' },
    { text: 'Contribute', url: '/docs/reference/contribute' },
    {
      type: 'icon',
      icon: DiscordIcon,
      text: 'Discord',
      label: 'Discord',
      url: 'https://discord.gg/zx6z2p4jVb',
    },
  ],
  githubUrl: 'https://github.com/AgentsKit-io/agentskit',
}
