import { describe, it, expect } from 'vitest'
import { consoleLogger } from '../src/console-logger'
import { langsmith } from '../src/langsmith'
import { opentelemetry } from '../src/opentelemetry'

describe('Observer contract compliance', () => {
  it('consoleLogger satisfies Observer', () => {
    const obs = consoleLogger()
    expect(obs.name).toBeTypeOf('string')
    expect(obs.name).toBeTruthy()
    expect(obs.on).toBeTypeOf('function')
  })

  it('langsmith satisfies Observer + lifecycle', () => {
    const obs = langsmith({ apiKey: 'test-key' })
    expect(obs.name).toBeTypeOf('string')
    expect(obs.name).toBeTruthy()
    expect(obs.on).toBeTypeOf('function')
    expect(obs.flush).toBeTypeOf('function')
    expect(obs.shutdown).toBeTypeOf('function')
  })

  it('opentelemetry satisfies Observer + lifecycle', () => {
    const obs = opentelemetry()
    expect(obs.name).toBeTypeOf('string')
    expect(obs.name).toBeTruthy()
    expect(obs.on).toBeTypeOf('function')
    expect(obs.flush).toBeTypeOf('function')
    expect(obs.shutdown).toBeTypeOf('function')
  })
})
