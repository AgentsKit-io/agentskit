import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { consoleLogger } from '../src/console-logger'
import type { AgentEvent } from '@agentskit/core'

describe('consoleLogger', () => {
  let output: string[]
  const originalWrite = process.stdout.write

  beforeEach(() => {
    output = []
    process.stdout.write = ((chunk: string) => { output.push(chunk); return true }) as typeof process.stdout.write
  })

  afterEach(() => {
    process.stdout.write = originalWrite
  })

  describe('human format (default)', () => {
    it('logs agent:step', () => {
      const logger = consoleLogger()
      logger.on({ type: 'agent:step', step: 1, action: 'initial' })
      expect(output[0]).toContain('step 1')
      expect(output[0]).toContain('initial')
    })

    it('logs llm:start', () => {
      const logger = consoleLogger()
      logger.on({ type: 'llm:start', messageCount: 3, model: 'gpt-4o' })
      expect(output[0]).toContain('llm:start')
      expect(output[0]).toContain('3 messages')
      expect(output[0]).toContain('gpt-4o')
    })

    it('logs llm:end with preview', () => {
      const logger = consoleLogger()
      logger.on({ type: 'llm:end', content: 'Hello world', durationMs: 500 })
      expect(output[0]).toContain('llm:end')
      expect(output[0]).toContain('500ms')
      expect(output[0]).toContain('Hello world')
    })

    it('truncates long content', () => {
      const logger = consoleLogger()
      const longContent = 'a'.repeat(200)
      logger.on({ type: 'llm:end', content: longContent, durationMs: 100 })
      expect(output[0]).toContain('...')
      expect(output[0].length).toBeLessThan(300)
    })

    it('logs tool:start and tool:end', () => {
      const logger = consoleLogger()
      logger.on({ type: 'tool:start', name: 'web_search', args: { query: 'test' } })
      expect(output[0]).toContain('tool:start')
      expect(output[0]).toContain('web_search')

      logger.on({ type: 'tool:end', name: 'web_search', result: 'found it', durationMs: 200 })
      expect(output[1]).toContain('tool:end')
      expect(output[1]).toContain('200ms')
    })

    it('logs error', () => {
      const logger = consoleLogger()
      logger.on({ type: 'error', error: new Error('boom') })
      expect(output[0]).toContain('error')
      expect(output[0]).toContain('boom')
    })

    it('logs memory events', () => {
      const logger = consoleLogger()
      logger.on({ type: 'memory:load', messageCount: 5 })
      expect(output[0]).toContain('memory:load')
      expect(output[0]).toContain('5 messages')
    })
  })

  describe('json format', () => {
    it('outputs valid JSON', () => {
      const logger = consoleLogger({ format: 'json' })
      logger.on({ type: 'llm:start', messageCount: 3 })
      const parsed = JSON.parse(output[0])
      expect(parsed.type).toBe('llm:start')
      expect(parsed.messageCount).toBe(3)
      expect(parsed.timestamp).toBeTruthy()
    })

    it('includes all event types', () => {
      const logger = consoleLogger({ format: 'json' })
      const events: AgentEvent[] = [
        { type: 'agent:step', step: 1, action: 'initial' },
        { type: 'llm:start', messageCount: 1 },
        { type: 'llm:first-token', latencyMs: 50 },
        { type: 'llm:end', content: 'hi', durationMs: 100 },
        { type: 'tool:start', name: 'test', args: {} },
        { type: 'tool:end', name: 'test', result: 'ok', durationMs: 10 },
        { type: 'memory:load', messageCount: 0 },
        { type: 'memory:save', messageCount: 2 },
        { type: 'error', error: new Error('fail') },
      ]
      for (const event of events) {
        logger.on(event)
      }
      expect(output).toHaveLength(9)
      for (const line of output) {
        expect(() => JSON.parse(line)).not.toThrow()
      }
    })
  })

  it('satisfies Observer contract', () => {
    const logger = consoleLogger()
    expect(logger.name).toBe('console-logger')
    expect(logger.on).toBeTypeOf('function')
  })
})
