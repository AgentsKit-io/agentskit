import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'AgentKit',
  tagline: 'Ship AI chat in 10 lines of React',
  favicon: 'img/favicon.ico',
  url: 'https://emersonbraun.github.io',
  baseUrl: '/agentkit/',
  organizationName: 'EmersonBraun',
  projectName: 'agentkit',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/EmersonBraun/agentkit/tree/main/docs/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'AgentKit',
      items: [
        { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs' },
        { href: 'https://github.com/EmersonBraun/agentkit', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Quick Start', to: '/docs/getting-started/quick-start' },
            { label: 'For AI Agents', to: '/docs/getting-started/for-ai-agents' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/EmersonBraun/agentkit' },
            { label: 'npm', href: 'https://www.npmjs.com/package/@agentkit/react' },
          ],
        },
      ],
      copyright: `Inspired by <a href="https://arrow-js.com/" style="color: inherit; text-decoration: underline;">Arrow.js</a>. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'tsx', 'typescript', 'css'],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
