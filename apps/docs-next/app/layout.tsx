import './global.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { alternatesFor } from '@/lib/locales'
import { AttributionCapture } from '@/components/analytics/attribution-capture'
import { AccessibleSearch } from '@/components/accessible-search'
import { EcosystemFooter } from '@/components/site-shell/ecosystem-footer'
import { SHELL_SCRIPT_SRC, SHELL_STYLESHEET_HREF } from '@/lib/shell'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

const SITE_URL = 'https://www.agentskit.io'
const DESCRIPTION =
  'AgentsKit is the foundation library for JavaScript agents — runtime, tools, memory, RAG, and UI bindings. Product chat lives in AgentsKit Chat.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AgentsKit — foundation library for JavaScript agents',
    template: '%s | AgentsKit',
  },
  description: DESCRIPTION,
  keywords: [
    'AI agents',
    'JavaScript agent toolkit',
    'TypeScript agent library',
    'foundation agent library',
    'AgentsKit',
    'LLM adapters',
    'agent runtime',
    'RAG toolkit',
    'OpenAI adapter',
    'Anthropic adapter',
  ],
  authors: [{ name: 'Emerson Braun', url: 'https://github.com/EmersonBraun' }],
  creator: 'Emerson Braun',
  category: 'technology',
  alternates: {
    canonical: SITE_URL,
    languages: alternatesFor('/'),
  },
  verification: {
    // Fill after verifying site in Google Search Console + Bing Webmaster:
    // google: 'YOUR_GSC_META_CONTENT',
    // other: { 'msvalidate.01': 'YOUR_BING_CONTENT' },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.svg' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'AgentsKit',
    title: 'AgentsKit — foundation library for JavaScript agents',
    description: DESCRIPTION,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'AgentsKit — foundation library for JavaScript agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit — foundation library for JavaScript agents',
    description: DESCRIPTION,
    images: ['/api/og'],
  },
}

export const viewport: Viewport = { colorScheme: 'dark light', themeColor: '#0b0f14' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt — AI-ingestion index" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full docs for LLM ingestion" />
        <link rel="stylesheet" href={SHELL_STYLESHEET_HREF} />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-clip font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ak-blue focus:px-3 focus:py-2 focus:text-ak-midnight">
          Skip to content
        </a>
        <RootProvider
          theme={{ defaultTheme: 'dark', enableSystem: false }}
          search={{
            options: {
              allowClear: true,
            },
          }}
        >
          <AccessibleSearch />
          <div id="main-content">{children}</div>
        </RootProvider>
        <EcosystemFooter />
        <AttributionCapture />
        <Analytics />
        <SpeedInsights />
        <script src={SHELL_SCRIPT_SRC} defer data-current="agentskit" data-current-repo="AgentsKit-io/agentskit" />
      </body>
    </html>
  )
}
