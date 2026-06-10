import './global.css'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })

const SITE_URL = 'https://registry.agentskit.io'
const DESCRIPTION = 'Ready-to-use AI agents for AgentsKit. Copy the source into your project — you own the code.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AgentsKit Registry — ready-to-use AI agents', template: '%s — AgentsKit Registry' },
  description: DESCRIPTION,
  openGraph: { title: 'AgentsKit Registry', description: DESCRIPTION, url: SITE_URL, siteName: 'AgentsKit Registry' },
  twitter: { card: 'summary_large_image', title: 'AgentsKit Registry', description: DESCRIPTION },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col overflow-x-clip font-sans">
        <RootProvider>{children}</RootProvider>
        <Script src="https://www.agentskit.io/ecosystem-bar.js" strategy="afterInteractive" data-current="registry" />
      </body>
    </html>
  )
}
