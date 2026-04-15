import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-10 flex items-center gap-4">
        <svg width="56" height="50" viewBox="0 0 72 64" fill="none" aria-hidden="true">
          <line
            x1="12"
            y1="52"
            x2="36"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="36"
            y1="12"
            x2="60"
            y2="52"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="52"
            x2="60"
            y2="52"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="36" cy="12" r="6" fill="currentColor" />
          <circle cx="12" cy="52" r="6" fill="currentColor" />
          <circle cx="60" cy="52" r="6" fill="currentColor" />
        </svg>
        <span className="font-mono text-2xl font-bold tracking-tight">agentskit</span>
      </div>

      <h1 className="mb-5 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        The agent toolkit JavaScript actually deserves.
      </h1>
      <p className="mb-2 max-w-2xl text-lg text-fd-muted-foreground">
        A 10KB core. Twelve plug-and-play packages. Zero lock-in.
      </p>
      <p className="mb-10 max-w-2xl text-base text-fd-muted-foreground">
        Six formal contracts that make every adapter, tool, skill, memory, retriever, and runtime
        substitutable.
      </p>

      <div className="mb-16 flex gap-3">
        <Link
          href="/docs"
          className="rounded-md bg-fd-primary px-5 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90"
        >
          Get started →
        </Link>
        <a
          href="https://github.com/EmersonBraun/agentskit"
          className="rounded-md border border-fd-border px-5 py-2 text-sm font-medium hover:bg-fd-accent"
        >
          GitHub
        </a>
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-4 text-left md:grid-cols-3">
        <Feature
          title="10KB core"
          desc="Zero-dependency foundation. Tree-shakable, edge-ready, predictable."
        />
        <Feature
          title="Plug-and-play"
          desc="Every package works alone or together. No framework lock-in."
        />
        <Feature
          title="Agent-first"
          desc="ReAct loops, tools, skills, delegation, memory — first-class, not afterthoughts."
        />
      </div>
    </main>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-fd-border p-4">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{desc}</p>
    </div>
  )
}
