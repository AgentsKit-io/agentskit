import { ImageResponse } from 'next/og'

// Social/link preview card (X, Slack, WhatsApp, LinkedIn, iMessage). Next wires
// this to both og:image and twitter:image automatically. On-brand: GitHub-dark
// surface + AgentsKit green accent.
export const runtime = 'edge'
export const alt = 'AgentsKit.js — the agent toolkit for JavaScript'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OG() {
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
            'radial-gradient(ellipse at top left, rgba(46,160,67,0.22), transparent 55%), #0d1117',
          color: '#e6edf3',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#2ea043',
            }}
          />
          <span style={{ fontSize: '30px', fontWeight: 700 }}>
            agentskit<span style={{ color: '#8b949e' }}>.js</span>
          </span>
        </div>
        <div style={{ fontSize: '64px', fontWeight: 700, lineHeight: 1.05, maxWidth: '900px' }}>
          Ship AI agents in JavaScript.
        </div>
        <div style={{ fontSize: '32px', color: '#8b949e', marginTop: '20px', maxWidth: '900px' }}>
          One ecosystem — chat UI, runtime, tools, memory, RAG, production guardrails.
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '44px', fontSize: '22px', color: '#2ea043' }}>
          <span>MIT</span>
          <span style={{ color: '#30363d' }}>·</span>
          <span>10 KB core</span>
          <span style={{ color: '#30363d' }}>·</span>
          <span>zero lock-in</span>
        </div>
      </div>
    ),
    size,
  )
}
