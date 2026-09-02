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
import ecosystem from '@/lib/ecosystem.json'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

const SITE_URL = 'https://www.agentskit.io'
const DESCRIPTION =
  'AgentsKit is the foundation library for JavaScript agents — runtime, tools, memory, RAG, and UI bindings. Product chat lives in AgentsKit Chat.'

const FOOTER_PRODUCTS = ecosystem.products
  .filter((product) => product.public || product.distributionClass === 'managed-service')
  .sort((a, b) => a.navigation.order - b.navigation.order)

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AgentsKit.js — foundation library for JavaScript agents',
    template: '%s | AgentsKit.js',
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
    siteName: 'AgentsKit.js',
    title: 'AgentsKit.js — foundation library for JavaScript agents',
    description: DESCRIPTION,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'AgentsKit.js — foundation library for JavaScript agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit.js — foundation library for JavaScript agents',
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
      </head>
      <body className="flex min-h-screen flex-col overflow-x-clip font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ak-blue focus:px-3 focus:py-2 focus:text-ak-midnight">
          Skip to content
        </a>
        <RootProvider
          search={{
            options: {
              allowClear: true,
            },
          }}
        >
          <AccessibleSearch />
          <div id="main-content">{children}</div>
        </RootProvider>
        <footer className="border-t border-ak-border bg-ak-midnight px-6 py-10 text-sm text-ak-graphite">
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ak-blue">Continue by problem</p>
              <p className="mt-2 max-w-2xl leading-6">
                AgentsKit is the open-source foundation. Choose a sibling by the next job; AKOS is optional managed
                operations and is not required to use the open-source products.
              </p>
            </div>
            <nav aria-label="AgentsKit ecosystem" className="flex flex-wrap gap-x-5 gap-y-2">
              {FOOTER_PRODUCTS.map((product) => (
                <a
                  key={product.id}
                  href={product.surfaces.home ?? product.surfaces.docs ?? '#'}
                  className="text-ak-foam underline decoration-ak-border underline-offset-4 hover:text-ak-blue"
                >
                  {product.name}
                  {product.distributionClass === 'managed-service' ? ' · optional managed' : ''}
                </a>
              ))}
            </nav>
          </div>
        </footer>
        <AttributionCapture />
        <Analytics />
        <SpeedInsights />
        <script src="/ecosystem-bar.js" defer data-current="agentskit" />
      </body>
    </html>
  )
}
