import { HomeLayout } from 'fumadocs-ui/layouts/home'
import type { ReactNode } from 'react'
import { baseOptions } from '../layout.config'

export default function RecipesLayout({ children }: { children: ReactNode }) {
  return <HomeLayout {...baseOptions}>{children}</HomeLayout>
}
