import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
