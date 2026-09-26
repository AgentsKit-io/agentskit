import './global.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { PostHogProvider } from './posthog-provider'
import { RegistryAskWidget } from '@/components/ask-widget'
import { serializedRegistryStructuredData } from '@/lib/structured-data'
import { AccessibleSearch } from '@/components/accessible-search'
import type { Viewport } from 'next'
import { EcosystemFooter } from '@/components/ecosystem-footer'
import { SHELL_SCRIPT_SRC, SHELL_STYLESHEET_HREF } from '@/lib/shell'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

const SITE_URL = 'https://registry.agentskit.io'
const DESCRIPTION = 'Shadcn-like AI agents for AgentsKit. Copy validated TypeScript source into your project — you own the code.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AgentsKit Registry — shadcn-like AI agents', template: '%s — AgentsKit Registry' },
  description: DESCRIPTION,
  openGraph: { title: 'AgentsKit Registry', description: DESCRIPTION, url: SITE_URL, siteName: 'AgentsKit Registry' },
  twitter: { card: 'summary_large_image', title: 'AgentsKit Registry', description: DESCRIPTION, creator: '@agentskit' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { colorScheme: 'dark light', themeColor: '#0b0f14' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Agent and docs index for LLMs" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full agent context for LLMs" />
        <link rel="stylesheet" href={SHELL_STYLESHEET_HREF} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedRegistryStructuredData }}
        />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-clip font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ak-blue focus:px-3 focus:py-2 focus:text-ak-midnight">
          Skip to content
        </a>
        <PostHogProvider>
          <RootProvider theme={{ defaultTheme: 'dark', enableSystem: false }} search={{ options: { allowClear: true } }}>
            <AccessibleSearch />
            <div id="main-content">{children}</div>
            <EcosystemFooter />
            <RegistryAskWidget />
          </RootProvider>
        </PostHogProvider>
        <script src={SHELL_SCRIPT_SRC} defer data-current="registry" data-current-repo="AgentsKit-io/agentskit-registry" data-ak-fonts="self" />
      </body>
    </html>
  )
}
