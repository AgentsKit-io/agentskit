import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from './_components/posthog-provider'

export const metadata: Metadata = {
  title: 'AgentsKit.js — Ship AI agents in JavaScript without gluing 8 libraries',
  description:
    'One ecosystem for chat UI, runtime, tools, memory, RAG, and observability. Start with one package, grow into the full stack. MIT, 10 KB core.',
  metadataBase: new URL('https://www.agentskit.io'),
  openGraph: {
    title: 'AgentsKit.js',
    description:
      'Chat UI, runtime, tools, memory, RAG, observability. One ecosystem. Zero lock-in. 10 KB core.',
    type: 'website',
    url: 'https://www.agentskit.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit.js',
    description: 'Chat UI, runtime, tools, memory, RAG, observability. One ecosystem.',
    creator: '@agentskit',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Shared ecosystem bar — single source on www.agentskit.io, embedded across all properties. */}
        <script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="agentskit" />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
