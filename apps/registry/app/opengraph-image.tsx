import { ImageResponse } from 'next/og'

// Default social/link preview for the registry gallery. Registry accent = blue.
export const alt = 'AgentsKit Registry — ready-to-use AI agents'
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
            'radial-gradient(ellipse at top left, rgba(88,166,255,0.22), transparent 55%), #0d1117',
          color: '#e6edf3',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: '64px', fontWeight: 700, lineHeight: 1.05 }}>AgentsKit Registry</div>
        <div style={{ fontSize: '30px', color: '#8b949e', marginTop: '20px', maxWidth: '900px' }}>
          Ready-to-use AI agents. Copy the source into your project — you own the code.
        </div>
        <div style={{ fontSize: '22px', color: '#58a6ff', marginTop: '40px' }}>npx agentskit add &lt;agent&gt;</div>
      </div>
    ),
    size,
  )
}
