import { StackBuilder } from '@/components/mdx/stack-builder'

export const metadata = {
  title: 'Stack builder — pick your AgentsKit',
  description:
    'Choose framework, provider, memory, and capabilities. Get install command + starter code. Your choices sync with every framework tab across the docs.',
}

export default function StackPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Stack builder</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
          Pick your <span className="ak-wordmark">AgentsKit</span> stack
        </h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Four choices, one snippet. Every setting persists locally and keeps the rest of the docs in sync — the framework you pick here becomes the default tab everywhere.
        </p>
      </div>
      <StackBuilder />
    </main>
  )
}
