import type { ReactNode } from 'react'

export function Swatch({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 16,
        height: 16,
        borderRadius: 4,
        background: color,
        border: '1px solid var(--color-ak-border)',
        verticalAlign: 'middle',
        marginRight: 8,
      }}
      aria-hidden="true"
    />
  )
}

type Row = {
  token: string
  value: string
  description: ReactNode
  color?: string
}

export function TokenTable({ rows }: { rows: Row[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Default (light)</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.token}>
              <td>
                <code>{r.token}</code>
              </td>
              <td>
                {r.color && <Swatch color={r.color} />}
                <code>{r.value}</code>
              </td>
              <td>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
