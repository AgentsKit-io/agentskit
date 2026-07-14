import Link from 'next/link'
import community from '@/data/community.json'
import { PartnerStrip } from '@/components/brand/partner-strip'

export const metadata = {
  title: 'Community — AgentsKit ecosystem',
  description:
    'Campaign landing for the AgentsKit ecosystem: understand the products, run a verified demo, contribute, and showcase what you built.',
}

type Project = { name: string; description: string; url: string; tags: string[]; by: string }

const FUNNEL = [
  {
    title: 'Understand',
    body: 'See how AgentsKit, Registry, Chat, Doc Bridge, Playbook, Code Review, and AgentsKit OS fit together.',
    href: '/docs/reference/contribute/newcomer-journey',
    cta: 'Newcomer journey',
  },
  {
    title: 'Try',
    body: 'Run a three-command demo without inventing metrics — claims stay generated.',
    href: '/docs/reference/contribute/newcomer-journey#three-command-demos',
    cta: 'Run demos',
  },
  {
    title: 'Contribute',
    body: 'Claim a good first issue with setup and test instructions already written.',
    href: '/docs/reference/contribute/good-first-issues',
    cta: 'Starter issues',
  },
  {
    title: 'Showcase',
    body: 'Submit a project or recipe through a normal pull request.',
    href: '/docs/reference/contribute/recipe-submission',
    cta: 'Submit work',
  },
] as const

export default function CommunityPage() {
  const data = community as { projects: Project[]; note: string }
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Community</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ak-foam">
          Build with <span className="ak-wordmark">AgentsKit</span>
        </h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          One campaign landing for the ecosystem: understand the products, try a verified demo, pick a
          contribution path, and showcase what you shipped — without private onboarding.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-ak-graphite">
          Broad public promotion stays gated on{' '}
          <a
            href="https://github.com/AgentsKit-io/agentskit/blob/main/docs/ecosystem/readiness.md"
            className="text-ak-foam underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ecosystem readiness
          </a>{' '}
          and HITL approval of the launch package.
        </p>
      </div>

      <PartnerStrip />

      <section className="mt-10" aria-labelledby="funnel-heading">
        <h2 id="funnel-heading" className="font-display text-xl font-semibold text-ak-foam">
          Contributor funnel
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {FUNNEL.map((step) => (
            <li key={step.title}>
              <Link
                href={step.href}
                className="group block h-full rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:border-ak-foam"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                  {step.title}
                </div>
                <p className="mt-2 text-sm text-ak-graphite">{step.body}</p>
                <div className="mt-3 text-sm font-medium text-ak-foam group-hover:underline">{step.cta} →</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="showcase-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="showcase-heading" className="font-display text-xl font-semibold text-ak-foam">
              Built with AgentsKit
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ak-graphite">
              {data.note} Submit via PR against{' '}
              <a
                href="https://github.com/AgentsKit-io/agentskit/blob/main/apps/docs-next/data/community.json"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ak-foam underline"
              >
                data/community.json
              </a>
              .
            </p>
          </div>
          <Link
            href="/docs/reference/contribute/recipe-submission"
            className="font-mono text-xs uppercase tracking-widest text-ak-foam underline"
          >
            Submission guide
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p) => (
            <li key={p.name}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-lg border border-ak-border bg-ak-surface p-5 transition hover:border-ak-foam"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
                  by {p.by}
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold text-ak-foam group-hover:text-ak-foam">
                  {p.name}
                </h3>
                <p className="mt-2 text-sm text-ak-graphite">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ak-border px-2 py-0.5 font-mono text-[10px] text-ak-graphite"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
