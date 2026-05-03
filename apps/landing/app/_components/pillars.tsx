const PILLARS = [
  {
    title: 'Tiny core',
    body: '@agentskit/core is under 10 KB gzipped with zero dependencies. Types, events, contracts. Nothing else.',
  },
  {
    title: 'Six contracts',
    body: 'Adapter, Tool, Skill, Memory, Retriever, Runtime. Swap any implementation without touching the rest.',
  },
  {
    title: 'Plug & Play',
    body: 'Start with one package, grow into the full stack. Every package is independently installable.',
  },
  {
    title: 'No lock-in',
    body: 'MIT licensed. Works with OpenAI, Anthropic, Gemini, Grok, Ollama, DeepSeek, and any ReadableStream.',
  },
] as const

export function Pillars() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">
        Built like a kit, not a framework
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map(p => (
          <div
            key={p.title}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-6 transition hover:border-[var(--color-accent)]"
          >
            <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
