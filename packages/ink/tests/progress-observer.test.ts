import { describe, expect, it } from 'vitest'
import { createProgressObserver } from '../src/progress-observer'

describe('createProgressObserver', () => {
  it('renders progress AgentEvents and ignores non-progress events', () => {
    const out: string[] = []
    const obs = createProgressObserver({ write: (s) => out.push(s), plain: true })

    obs.on({ type: 'progress', label: 'classify', status: 'start' })
    obs.on({ type: 'progress', label: 'classify', status: 'ok', detail: 'ui-ux · enrich', durationMs: 600 })
    obs.on({ type: 'progress', label: 'leak-gate', status: 'error', detail: 'blocked: ACME-42' })
    obs.on({ type: 'llm:start', model: 'x', messageCount: 1 }) // not a progress event → ignored

    const text = out.join('')
    expect(text).toContain('classify')
    expect(text).toContain('✓')
    expect(text).toContain('ui-ux · enrich')
    expect(text).toContain('(0.6s)')
    expect(text).toContain('⛔')
    expect(text).not.toContain('llm:start')
  })
})
