import { LINKS } from './links'

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg-soft)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
        v1 contracts frozen — 19 packages stable
      </p>
      <h1 className="mx-auto max-w-3xl text-balance text-5xl font-semibold tracking-tight md:text-6xl">
        Ship AI agents in JavaScript without gluing 8 libraries.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-[var(--color-fg-soft)]">
        AgentsKit is the agent toolkit JavaScript actually deserves. A 10 KB core. Six formal contracts.
        Every adapter, tool, skill, memory, retriever, and runtime is substitutable.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href={LINKS.docs}
          className="rounded-md bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--color-accent)]/20 transition hover:bg-[var(--color-accent-soft)]"
        >
          Get started
        </a>
        <a
          href={LINKS.github}
          className="rounded-md border border-[var(--color-border)] px-5 py-3 text-sm font-medium hover:border-[var(--color-accent)]"
        >
          Star on GitHub →
        </a>
      </div>
    </section>
  )
}
