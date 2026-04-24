const PARTNERS = [
  { name: 'OpenAI', tier: 'Provider', url: '/docs/data/providers/openai' },
  { name: 'Anthropic', tier: 'Provider', url: '/docs/data/providers/anthropic' },
  { name: 'Google Gemini', tier: 'Provider', url: '/docs/data/providers/gemini' },
  { name: 'OpenRouter', tier: 'Provider', url: '/docs/data/providers/openrouter' },
  { name: 'Ollama', tier: 'Provider', url: '/docs/data/providers/ollama' },
  { name: 'Vercel AI SDK', tier: 'Interop', url: '/docs/data/providers/vercel-ai' },
  { name: 'LangChain', tier: 'Interop', url: '/docs/data/providers/langchain' },
  { name: 'LangGraph', tier: 'Interop', url: '/docs/data/providers/langgraph' },
]

export function PartnerStrip() {
  return (
    <section
      data-ak-partners
      aria-label="Integrated providers and interop layers"
      className="my-12 rounded-lg border border-ak-border bg-ak-surface p-5"
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
            Integrated with
          </div>
          <h2 className="font-display text-xl font-semibold text-white">Works with what you already use</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          {PARTNERS.length} and counting
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PARTNERS.map((p) => (
          <li key={p.name}>
            <a
              href={p.url}
              className="group flex h-full flex-col rounded-md border border-ak-border bg-ak-midnight p-3 transition hover:border-ak-foam"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                {p.tier}
              </span>
              <span className="mt-1 font-display text-base font-semibold text-white group-hover:text-ak-foam">
                {p.name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
