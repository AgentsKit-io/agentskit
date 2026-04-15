'use client'

import React, { useState, type ReactNode } from 'react'

interface ExampleWrapperProps {
  children: ReactNode
  title: string
  description?: string
  source?: string
}

export function ExampleWrapper({ children, title, description, source }: ExampleWrapperProps) {
  const [showSource, setShowSource] = useState(false)

  return (
    <div
      style={{
        border: '1px solid var(--color-ak-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '2rem',
        background: 'var(--color-ak-surface)',
      }}
    >
      <div
        style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--color-ak-border)',
          background: 'var(--color-ak-midnight)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ color: 'var(--color-ak-foam)' }}>
          <strong>{title}</strong>
          {description && (
            <span style={{ marginLeft: '0.75rem', color: 'var(--color-ak-graphite)', fontSize: '0.9rem' }}>
              {description}
            </span>
          )}
        </div>
        {source && (
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-ak-border)',
              borderRadius: '6px',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: 'var(--color-ak-graphite)',
            }}
          >
            {showSource ? 'Hide Code' : 'Show Code'}
          </button>
        )}
      </div>
      <div style={{ padding: '1.5rem' }}>{children}</div>
      {showSource && source && (
        <div style={{ borderTop: '1px solid var(--color-ak-border)', background: 'var(--color-ak-midnight)' }}>
          <pre style={{ margin: 0, padding: '1rem 1.5rem', fontSize: '0.85rem', overflow: 'auto', color: 'var(--color-ak-foam)' }}>
            <code>{source}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
