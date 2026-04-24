import Link from 'next/link'

export const metadata = {
  title: 'AgentsKit.js — o toolkit de agentes que o JavaScript merece',
  description:
    'Família de pacotes pequenos e plug-and-play que cobrem todo o ciclo de vida de agentes IA em JavaScript: chat UI, runtime autônomo, ferramentas, skills, memória, RAG, observabilidade, avaliação.',
  alternates: { canonical: 'https://www.agentskit.io/pt', languages: { en: '/', 'pt-BR': '/pt' } },
}

const BLOCKS = [
  {
    kicker: 'Para quem está chegando',
    title: 'Construa seu primeiro agente',
    desc: 'Caminho mais curto: provider + runtime + ferramentas + memória + observabilidade trabalhando juntos.',
    href: '/docs/get-started/getting-started/build-your-first-agent',
    cta: 'Começar →',
  },
  {
    kicker: 'Para quem avalia',
    title: 'Arquitetura em um olhar',
    desc: 'Entenda quais camadas existem, o que cada uma resolve, e como elas se compõem.',
    href: '/docs/get-started/architecture-at-a-glance',
    cta: 'Ver o diagrama →',
  },
  {
    kicker: 'Para quem já entendeu',
    title: 'Cookbook',
    desc: '8 receitas auto-contidas para copiar: streaming, tools + memória, auth, rate limit, RAG.',
    href: '/docs/cookbook',
    cta: 'Abrir receitas →',
  },
  {
    kicker: 'Interativo',
    title: 'Stack builder',
    desc: 'Escolha framework, provider, memória e capacidades — receba comando de install + snippet.',
    href: '/stack',
    cta: 'Montar stack →',
  },
]

export default function HomePt() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16">
      <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">
        AgentsKit.js · pt-BR
      </div>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
        O toolkit de agentes que o{' '}
        <span className="ak-wordmark">JavaScript merece</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ak-graphite">
        Uma família de pacotes pequenos e plug-and-play cobrindo todo o ciclo: chat UI, runtime
        autônomo, tools, skills, memória, RAG, observabilidade e avaliação. Instale só o que precisa.
        O resto fica fora do seu bundle.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/docs/get-started/getting-started/build-your-first-agent"
          className="rounded-md bg-ak-foam px-4 py-2 text-sm font-semibold text-ak-midnight hover:bg-white"
        >
          Começar agora
        </Link>
        <Link
          href="/docs"
          className="rounded-md border border-ak-border px-4 py-2 text-sm font-semibold text-ak-foam hover:border-ak-foam"
        >
          Abrir documentação (EN)
        </Link>
      </div>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        {BLOCKS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:border-ak-foam"
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
              {b.kicker}
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold text-white">{b.title}</h2>
            <p className="mt-2 text-sm text-ak-graphite">{b.desc}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-ak-foam group-hover:text-white">
              {b.cta}
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-14 rounded-lg border border-ak-border bg-ak-surface p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          Sobre a tradução
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold text-white">
          Documentação em português chegando aos poucos
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ak-graphite">
          A documentação oficial está em inglês; estamos traduzindo as páginas principais para pt-BR.
          Se você quiser ajudar, veja o{' '}
          <Link href="/docs/reference/contribute" className="text-ak-foam underline">
            guia de contribuição
          </Link>{' '}
          ou abra um{' '}
          <a
            href="https://github.com/AgentsKit-io/agentskit/issues/new?title=docs(pt-BR)%3A%20"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ak-foam underline"
          >
            issue no GitHub
          </a>
          .
        </p>
      </section>
    </main>
  )
}
