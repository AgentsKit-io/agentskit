import { Header } from './_components/header'
import { Hero } from './_components/hero'
import { CodeSample } from './_components/code-sample'
import { Pillars } from './_components/pillars'
import { PackagesGrid } from './_components/packages-grid'
import { InstallCta } from './_components/install-cta'
import { Footer } from './_components/footer'

export default function HomePage() {
  return (
    <main>
      <Header />
      <Hero />
      <CodeSample />
      <Pillars />
      <PackagesGrid />
      <InstallCta />
      <Footer />
    </main>
  )
}
