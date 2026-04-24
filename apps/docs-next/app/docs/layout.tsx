import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'
import { baseOptions } from '../layout.config'
import { AskDocsWidget } from '@/components/docs/ask-widget'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
      <AskDocsWidget />
    </DocsLayout>
  )
}
