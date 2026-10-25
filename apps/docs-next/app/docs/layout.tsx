import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'
import { baseOptions } from '../layout.config'
import { AskDocsWidget } from '@/components/docs/ask-widget'

const askEndpoint = process.env.NEXT_PUBLIC_ASK_ENDPOINT

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
      {askEndpoint ? <AskDocsWidget endpoint={askEndpoint} /> : null}
    </DocsLayout>
  )
}
