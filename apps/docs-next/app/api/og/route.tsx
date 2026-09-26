import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 }

const SECTION_ACCENTS: Record<string, { label: string; color: string }> = {
  'getting-started': { label: 'Getting Started', color: '#58A6FF' },
  concepts: { label: 'Concepts', color: '#D2A8FF' },
  examples: { label: 'Examples', color: '#2EA043' },
  recipes: { label: 'Recipes', color: '#F0B429' },
  contribute: { label: 'Contribute', color: '#F85149' },
  adapters: { label: 'Adapters', color: '#58A6FF' },
  agents: { label: 'Agents', color: '#D2A8FF' },
  'chat-uis': { label: 'Chat UIs', color: '#58A6FF' },
  'data-layer': { label: 'Data Layer', color: '#2EA043' },
  infrastructure: { label: 'Infrastructure', color: '#F0B429' },
  packages: { label: 'Packages', color: '#E6EDF3' },
  migrating: { label: 'Migrating', color: '#F0B429' },
  hooks: { label: 'Hooks', color: '#58A6FF' },
  theming: { label: 'Theming', color: '#D2A8FF' },
  components: { label: 'Components', color: '#58A6FF' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')?.slice(0, 100) ?? 'AgentsKit'
  const description =
    searchParams.get('description')?.slice(0, 200) ??
    'The agent toolkit JavaScript actually deserves.'
  const sectionKey = searchParams.get('section') ?? ''
  const section = SECTION_ACCENTS[sectionKey] ?? null
  const accent = section?.color ?? '#58A6FF'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#0D1117',
          color: '#E6EDF3',
          fontFamily: 'JetBrains Mono, Menlo, monospace',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: accent,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="56" height="50" viewBox="0 0 72 64" fill="none">
              <line x1="12" y1="52" x2="36" y2="12" stroke="#E6EDF3" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="36" y1="12" x2="60" y2="52" stroke="#E6EDF3" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="52" x2="60" y2="52" stroke="#E6EDF3" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="36" cy="12" r="6" fill="#E6EDF3" />
              <circle cx="12" cy="52" r="6" fill="#E6EDF3" />
              <circle cx="60" cy="52" r="6" fill="#E6EDF3" />
            </svg>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
              agentskit
            </span>
          </div>

          {section && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                border: `1px solid ${accent}66`,
                borderRadius: 999,
                background: `${accent}14`,
                color: accent,
                fontSize: 20,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accent,
                  display: 'inline-block',
                }}
              />
              {section.label}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#8B949E',
              lineHeight: 1.35,
              fontFamily: 'Inter, system-ui, sans-serif',
              maxWidth: 980,
            }}
          >
            {description}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8B949E', fontSize: 20 }}>
          <div style={{ display: 'flex', gap: 32 }}>
            <span>10KB core</span>
            <span style={{ color: '#30363D' }}>·</span>
            <span>six formal contracts</span>
            <span style={{ color: '#30363D' }}>·</span>
            <span>zero lock-in</span>
          </div>
          <span style={{ color: accent, fontSize: 22 }}>agentskit.io</span>
        </div>
      </div>
    ),
    SIZE,
  )
}
