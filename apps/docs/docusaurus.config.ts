import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'AgentsKit',
  tagline: 'Open-source, extensible agent toolkit for JavaScript — React, Ink, CLI, runtime, RAG, and shared core types',
  favicon: 'img/favicon.ico',
  url: 'https://emersonbraun.github.io',
  baseUrl: '/agentskit/',
  organizationName: 'EmersonBraun',
  projectName: 'agentskit',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap',
      },
    },
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'pt-BR', 'zh-Hans'],
    localeConfigs: {
      en: { label: 'English', htmlLang: 'en', direction: 'ltr' },
      es: { label: 'Español', htmlLang: 'es', direction: 'ltr' },
      'pt-BR': { label: 'Português (BR)', htmlLang: 'pt-BR', direction: 'ltr' },
      'zh-Hans': { label: '简体中文', htmlLang: 'zh-Hans', direction: 'ltr' },
    },
  },
  clientModules: [require.resolve('./src/clientModules/ak-cta-analytics.ts')],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/EmersonBraun/agentskit/tree/main/apps/docs/docs/',
          editLocalizedFiles: true,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'AgentsKit',
      items: [
        {
          type: 'doc',
          docId: 'getting-started/read-this-first',
          label: 'Start here',
          position: 'left',
        },
        { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs' },
        { type: 'localeDropdown', position: 'right' },
        { href: 'https://github.com/EmersonBraun/agentskit', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Start here', to: '/docs/getting-started/read-this-first' },
            { label: 'Quick Start', to: '/docs/getting-started/quick-start' },
            { label: 'Packages overview', to: '/docs/packages/overview' },
            { label: 'For AI Agents', to: '/docs/getting-started/for-ai-agents' },
          ],
        },
        {
          title: 'Open Source',
          items: [
            { label: 'AI Summary Hub', href: 'https://emersonbraun.github.io/ai-summary-hub/' },
            { label: 'Skills — Reusable AI skills', href: 'https://github.com/EmersonBraun/skills' },
            {
              label: 'All @agentskit packages',
              href: 'https://www.npmjs.com/search?q=scope%3Aagentskit',
            },
          ],
        },
        {
          title: 'Connect',
          items: [
            { label: 'Website', href: 'https://emersonbraun.dev/' },
            { label: 'LinkedIn', href: 'https://www.linkedin.com/in/emerson-braun/' },
            { label: 'X / Twitter', href: 'https://x.com/EmersonfBraun' },
            { label: 'Instagram', href: 'https://www.instagram.com/emerson.braun.dev/' },
            { label: 'YouTube', href: 'https://www.youtube.com/@emerson.braun_dev' },
          ],
        },
      ],
      copyright: `AgentsKit. Created by  <a href="https://emersonbraun.dev/" target="_blank" style="color: inherit; text-decoration: underline;">Emerson Braun</a>.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'tsx', 'typescript', 'css'],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
