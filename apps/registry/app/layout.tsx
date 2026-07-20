import './global.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { PostHogProvider } from './posthog-provider'
import { RegistryAskWidget } from '@/components/ask-widget'

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Agent and docs index for LLMs" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full agent context for LLMs" />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-clip font-sans">
        <PostHogProvider>
          <RootProvider search={{ options: { allowClear: true } }}>
            {children}
            <RegistryAskWidget />
          </RootProvider>
        </PostHogProvider>
        <script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="registry" />
      </body>
    </html>
  )
}
