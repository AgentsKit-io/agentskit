'use client'

import { useEffect, useState } from 'react'
import { REPO, GOOD_FIRST_URL } from './github-data'

type Issue = {
  number: number
  title: string
  html_url: string
  labels: { name: string; color: string }[]
  comments: number
  user: { login: string; avatar_url: string }
}

export function GoodFirstIssuesList() {
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${REPO}/issues?state=open&labels=good%20first%20issue&per_page=20`,
        )
        if (!res.ok) {
          if (!cancelled) setErr(true)
          return
        }
        const data = (await res.json()) as Issue[]
        if (!cancelled) setIssues(data.filter(i => !(i as unknown as { pull_request?: unknown }).pull_request))
      } catch {
        if (!cancelled) setErr(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (err) {
    return (
      <p>
        <a href={GOOD_FIRST_URL}>View all good-first-issues on GitHub →</a>
      </p>
    )
  }

  if (issues === null) {
    return <p style={{ opacity: 0.6 }}>Loading issues…</p>
  }

  if (issues.length === 0) {
    return (
      <p>
        None open right now. <a href={GOOD_FIRST_URL}>Check all labels →</a>
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '1rem 0' }}>
      {issues.map(issue => (
        <a
          key={issue.number}
          href={issue.html_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            gap: 12,
            padding: '10px 14px',
            border: '1px solid var(--color-fd-border)',
            borderRadius: 8,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.6, minWidth: 50 }}>
            #{issue.number}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: 500 }}>{issue.title}</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {issue.labels.slice(0, 4).map(l => (
                <span
                  key={l.name}
                  style={{
                    fontSize: 11,
                    padding: '1px 8px',
                    borderRadius: 10,
                    background: `#${l.color}22`,
                    color: `#${l.color}`,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {l.name}
                </span>
              ))}
            </span>
          </span>
          <span style={{ fontSize: 12, opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
            💬 {issue.comments}
          </span>
        </a>
      ))}
    </div>
  )
}
