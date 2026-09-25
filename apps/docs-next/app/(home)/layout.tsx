import { HomeLayout } from 'fumadocs-ui/layouts/home'
import type { ReactNode } from 'react'
import { baseOptions } from '../layout.config'
import { AskDocsWidget } from '@/components/docs/ask-widget'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout {...baseOptions}>
      {children}
      {/* Surface the Ask-the-docs example without covering the home content. */}
      <AskDocsWidget />
    </HomeLayout>
  )
}
