import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 64) / 72)}
      viewBox="0 0 72 64"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="12"
        y1="52"
        x2="36"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="12"
        x2="60"
        y2="52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="52"
        x2="60"
        y2="52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="36" cy="12" r="6" fill="currentColor" />
      <circle cx="12" cy="52" r="6" fill="currentColor" />
      <circle cx="60" cy="52" r="6" fill="currentColor" />
    </svg>
  )
}

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="flex items-center gap-2">
        <LogoMark />
        <span className="font-mono font-bold tracking-tight">agentskit</span>
      </span>
    ),
  },
  links: [
    { text: 'Documentation', url: '/docs' },
    { text: 'Examples', url: '/docs/examples' },
    { text: 'Contribute', url: '/docs/contribute' },
    { text: 'GitHub', url: 'https://github.com/EmersonBraun/agentskit' },
    { text: 'Manifesto', url: 'https://github.com/EmersonBraun/agentskit/blob/main/MANIFESTO.md' },
  ],
  githubUrl: 'https://github.com/EmersonBraun/agentskit',
}
