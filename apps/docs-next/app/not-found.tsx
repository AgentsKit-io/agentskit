import Link from 'next/link'
import { AnimatedLogo } from '@/components/brand/animated-logo'

export default function NotFound() {
  const repo = 'AgentsKit-io/agentskit'
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <AnimatedLogo variant="hero" size={64} loop />
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">404</div>
      <h1 className="text-4xl font-bold text-ak-foam md:text-5xl">Page not found</h1>
      <p className="max-w-md text-ak-graphite">
        This URL doesn&apos;t exist — or it used to and moved. If you think a doc is missing, we&apos;d love a PR.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-ak-foam px-5 py-2.5 text-sm font-semibold text-ak-midnight hover:bg-white"
        >
          Back home
        </Link>
        <Link
          href="/docs"
          className="rounded-md border border-ak-border bg-ak-surface px-5 py-2.5 text-sm font-medium text-ak-foam hover:border-ak-blue"
        >
          Read the docs
        </Link>
        <a
          href={`https://github.com/${repo}/issues/new?title=docs:+missing+page`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-ak-border bg-ak-surface px-5 py-2.5 text-sm font-medium text-ak-foam hover:border-ak-blue"
        >
          Open an issue →
        </a>
        <Link
          href="/docs/contribute"
          className="rounded-md border border-ak-border bg-ak-surface px-5 py-2.5 text-sm font-medium text-ak-foam hover:border-ak-blue"
        >
          Contribute
        </Link>
      </div>
    </main>
  )
}
