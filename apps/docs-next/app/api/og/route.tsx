import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')?.slice(0, 100) ?? 'AgentsKit'
  const description =
    searchParams.get('description')?.slice(0, 200) ??
    'The agent toolkit JavaScript actually deserves.'

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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="56" height="50" viewBox="0 0 72 64" fill="none">
            <line
              x1="12"
              y1="52"
              x2="36"
              y2="12"
              stroke="#E6EDF3"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="36"
              y1="12"
              x2="60"
              y2="52"
              stroke="#E6EDF3"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="52"
              x2="60"
              y2="52"
              stroke="#E6EDF3"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="36" cy="12" r="6" fill="#E6EDF3" />
            <circle cx="12" cy="52" r="6" fill="#E6EDF3" />
            <circle cx="60" cy="52" r="6" fill="#E6EDF3" />
          </svg>
          <span
            style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            agentskit
          </span>
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

        <div style={{ display: 'flex', gap: 32, color: '#8B949E', fontSize: 20 }}>
          <span>10KB core</span>
          <span style={{ color: '#30363D' }}>·</span>
          <span>six formal contracts</span>
          <span style={{ color: '#30363D' }}>·</span>
          <span>zero lock-in</span>
        </div>
      </div>
    ),
    SIZE,
  )
}
