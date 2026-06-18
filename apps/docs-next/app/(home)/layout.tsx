import { HomeLayout } from 'fumadocs-ui/layouts/home'
import type { ReactNode } from 'react'
import { baseOptions } from '../layout.config'
import { AskDocsWidget } from '@/components/docs/ask-widget'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout {...baseOptions}>
      {children}
      {/* The Ask-the-docs chat is itself built on AgentsKit — surface it on the
          home so visitors can try the flagship example. Closed by default here
          (it opens by default only on /docs, where it's the primary tool). */}
      <AskDocsWidget defaultOpen={false} />
    </HomeLayout>
  )
}
