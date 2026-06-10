import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

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
  },
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Shared ecosystem bar — single source on www.agentskit.io, embedded across all properties. */}
        <Script src="https://www.agentskit.io/ecosystem-bar.js" strategy="afterInteractive" data-current="agentskit" />
        {children}
      </body>
    </html>
  )
}
