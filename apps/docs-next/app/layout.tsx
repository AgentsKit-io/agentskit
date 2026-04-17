import './global.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

const SITE_URL = 'https://www.agentskit.io'
const DESCRIPTION = 'The agent toolkit JavaScript actually deserves.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AgentsKit.js — the agent toolkit JavaScript actually deserves',
    template: '%s | AgentsKit.js',
  },
  description: DESCRIPTION,
  keywords: [
    'AI agents',
    'JavaScript agent toolkit',
    'TypeScript AI',
    'LLM chat UI',
    'React AI hooks',
    'OpenAI adapter',
    'Anthropic adapter',
    'streaming chat',
    'agent framework',
    'RAG toolkit',
  ],
  authors: [{ name: 'Emerson Braun', url: 'https://github.com/EmersonBraun' }],
  creator: 'Emerson Braun',
  category: 'technology',
  alternates: {
    canonical: SITE_URL,
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
    title: 'AgentsKit.js — the agent toolkit JavaScript actually deserves',
    description: DESCRIPTION,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'AgentsKit.js — the agent toolkit JavaScript actually deserves',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit.js — the agent toolkit JavaScript actually deserves',
    description: DESCRIPTION,
    images: ['/api/og'],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col overflow-x-clip font-sans">
        <RootProvider>{children}</RootProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
