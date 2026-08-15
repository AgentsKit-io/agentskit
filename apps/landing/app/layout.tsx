import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from './_components/posthog-provider'
import ecosystem from '../lib/ecosystem.json'

export const metadata: Metadata = {
  title: 'AgentsKit.js — Ship AI agents in JavaScript without gluing 8 libraries',
  description:
    'One ecosystem for chat UI, runtime, tools, memory, RAG, and observability. Start with one package, grow into the full stack. MIT, 10 KB core.',
  metadataBase: new URL('https://www.agentskit.io'),
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
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

const PRODUCT_LIST = ecosystem.products
  .filter((product) => product.public || product.distributionClass === 'managed-service')
  .sort((a, b) => a.navigation.order - b.navigation.order)
  .map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: product.distributionClass === 'managed-service'
      ? {
          '@type': 'Service',
          name: product.name,
          description: `${product.promise} Optional; not required to use the open-source products.`,
          serviceType: 'Managed operations',
          url: product.surfaces.home,
        }
      : {
          '@type': 'SoftwareSourceCode',
          name: product.name,
          description: product.promise,
          codeRepository: product.repo ? `https://github.com/${product.repo}` : undefined,
          url: product.surfaces.docs ?? product.surfaces.home,
        },
  }))

const LANDING_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.agentskit.io/#organization',
      name: 'AgentsKit',
      url: 'https://www.agentskit.io/',
      sameAs: [
        'https://github.com/AgentsKit-io/agentskit',
        'https://www.npmjs.com/org/agentskit',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.agentskit.io/#website',
      name: 'AgentsKit',
      url: 'https://www.agentskit.io/',
      publisher: { '@id': 'https://www.agentskit.io/#organization' },
    },
    {
      '@type': 'WebPage',
      '@id': 'https://www.agentskit.io/#webpage',
      name: 'AgentsKit.js',
      url: 'https://www.agentskit.io/',
      isPartOf: { '@id': 'https://www.agentskit.io/#website' },
    },
    {
      '@type': 'ItemList',
      '@id': 'https://www.agentskit.io/#ecosystem-products',
      name: 'AgentsKit ecosystem products',
      numberOfItems: PRODUCT_LIST.length,
      itemListElement: PRODUCT_LIST,
    },
  ],
}).replace(/</g, '\\u003c')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LANDING_JSON_LD }} />
        {/* Shared ecosystem bar — single source on www.agentskit.io, embedded across all properties. */}
        <script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="agentskit" />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
