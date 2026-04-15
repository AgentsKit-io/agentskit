import './global.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Suspense, type ReactNode } from 'react'
import { AnalyticsProvider } from '@/lib/analytics'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

const SITE_URL = 'https://agentskit.io'
const DESCRIPTION = 'The agent toolkit JavaScript actually deserves.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AgentsKit',
    template: '%s | AgentsKit',
  },
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.svg' }],
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'AgentsKit',
    title: 'AgentsKit',
    description: DESCRIPTION,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'AgentsKit — the agent toolkit JavaScript actually deserves',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit',
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
      <body className="flex flex-col min-h-screen font-sans">
        <Suspense fallback={null}>
          <AnalyticsProvider>
            <RootProvider>{children}</RootProvider>
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  )
}
