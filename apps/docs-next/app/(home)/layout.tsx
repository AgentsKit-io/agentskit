import { HomeLayout } from 'fumadocs-ui/layouts/home'
import type { ReactNode } from 'react'
import { baseOptions } from '../layout.config'
import { AskDocsWidget } from '@/components/docs/ask-widget'

const askEndpoint = process.env.NEXT_PUBLIC_ASK_ENDPOINT

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout {...baseOptions}>
      {children}
      {/* Surface the Ask-the-docs example without covering the home content. */}
      {askEndpoint ? <AskDocsWidget endpoint={askEndpoint} /> : null}
    </HomeLayout>
  )
}
