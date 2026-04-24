import community from '@/data/community.json'
import { PartnerStrip } from '@/components/brand/partner-strip'

export const metadata = {
  title: 'Community — built with AgentsKit.js',
  description:
    'Open-source projects, templates, and production apps built on AgentsKit.js. Submit yours via a PR against data/community.json.',
}

type Project = { name: string; description: string; url: string; tags: string[]; by: string }

export default function CommunityPage() {
  const data = community as { projects: Project[]; note: string }
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-foam">Community</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
          Built with <span className="ak-wordmark">AgentsKit</span>
        </h1>
        <p className="mt-3 max-w-2xl text-ak-graphite">
          Projects, templates, and production apps by the people using AgentsKit.js. Submit yours by
          opening a PR against{' '}
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

      <PartnerStrip />

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
              <h3 className="mt-1 font-display text-lg font-semibold text-white group-hover:text-ak-foam">
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
    </main>
  )
}
