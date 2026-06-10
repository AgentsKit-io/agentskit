import { ImageResponse } from 'next/og'
import { getAgent } from '@/lib/registry'

// Per-agent social/link preview card. Shared to X/Slack/LinkedIn when an
// individual agent is linked. Registry accent = blue.
export const alt = 'AgentsKit Registry agent'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(id)
  const title = agent?.title ?? 'AgentsKit Registry'
  const description = agent?.description ?? 'Ready-to-use AI agents for AgentsKit.'
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'radial-gradient(ellipse at top left, rgba(88,166,255,0.22), transparent 55%), #0d1117',
          color: '#e6edf3',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: '22px', color: '#58a6ff', marginBottom: '20px', letterSpacing: '0.12em' }}>
          AGENTSKIT REGISTRY
        </div>
        <div style={{ fontSize: '60px', fontWeight: 700, lineHeight: 1.05, maxWidth: '960px' }}>{title}</div>
        <div style={{ fontSize: '28px', color: '#8b949e', marginTop: '20px', maxWidth: '960px' }}>
          {description.length > 140 ? description.slice(0, 137) + '…' : description}
        </div>
        <div style={{ fontSize: '22px', color: '#58a6ff', marginTop: '40px' }}>npx agentskit add {id}</div>
      </div>
    ),
    size,
  )
}
