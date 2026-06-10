import type { ReactNode } from 'react'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '../layout.config'

export default function EcosystemLayout({
  children,
}: {
  children: ReactNode
}) {
  return <HomeLayout {...baseOptions}>{children}</HomeLayout>
}
