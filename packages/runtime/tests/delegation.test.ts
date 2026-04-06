import { describe, it, expect } from 'vitest'
import type { AgentEvent, Observer, SkillDefinition } from '@agentskit/core'
import { createRuntime } from '../src/runner'
import { createSharedContext } from '../src/shared-context'
import { createSequentialAdapter } from './helpers'

function createCallCountAdapter(callResponses: Array<Array<{ type: string; content?: string; toolCall?: { id: string; name: string; args: string } }>>) {
  let callCount = 0
  return {
    createSource: () => {
      const chunks = callResponses[callCount] ?? [{ type: 'text', content: 'no more calls' }, { type: 'done' }]
      callCount++
      let aborted = false
      return {
        stream: async function* () {
          for (const chunk of chunks) {
            if (aborted) return
            yield chunk
          }
        },
        abort: () => { aborted = true },
      }
    },
  }
}

describe('multi-agent delegation', () => {
  const researcherSkill: SkillDefinition = {
    name: 'researcher',
    description: 'Researches topics',
    systemPrompt: 'You are a researcher.',
  }

  const coderSkill: SkillDefinition = {
    name: 'coder',
    description: 'Writes code',
    systemPrompt: 'You are a coder.',
  }

  it('parent delegates to one child and receives result', async () => {
    const adapter = createCallCountAdapter([
      // Call 1: Parent delegates to researcher
      [
        { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"find papers on AI"}' } },
        { type: 'done' },
      ],
      // Call 2: Child researcher responds
      [
        { type: 'text', content: 'Found 3 papers on AI safety.' },
        { type: 'done' },
      ],
      // Call 3: Parent responds with delegation result
      [
        { type: 'text', content: 'Based on the research: AI safety has 3 key papers.' },
        { type: 'done' },
      ],
    ])

    const runtime = createRuntime({
      adapter,
      delegates: {
        researcher: { skill: researcherSkill },
      },
    })

    const result = await runtime.run('Research AI safety')

    expect(result.content).toBe('Based on the research: AI safety has 3 key papers.')
    const delegateCall = result.toolCalls.find(tc => tc.name === 'delegate_researcher')
    expect(delegateCall?.status).toBe('complete')
    expect(delegateCall?.result).toBe('Found 3 papers on AI safety.')
  })

  it('parent delegates to multiple children in parallel', async () => {
    const adapter = createCallCountAdapter([
      // Call 1: Parent delegates to both
      [
        { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"research"}' } },
        { type: 'tool_call', toolCall: { id: 'tc2', name: 'delegate_coder', args: '{"task":"code"}' } },
        { type: 'done' },
      ],
      // Call 2: researcher child responds
      [
        { type: 'text', content: 'research done' },
        { type: 'done' },
      ],
      // Call 3: coder child responds
      [
        { type: 'text', content: 'code done' },
        { type: 'done' },
      ],
      // Call 4: Parent final response
      [
        { type: 'text', content: 'All done.' },
        { type: 'done' },
      ],
    ])

    const runtime = createRuntime({
      adapter,
      delegates: {
        researcher: { skill: researcherSkill },
        coder: { skill: coderSkill },
      },
    })

    const result = await runtime.run('Build feature')

    expect(result.content).toBe('All done.')
    expect(result.toolCalls.filter(tc => tc.name.startsWith('delegate_'))).toHaveLength(2)
  })

  it('emits agent:delegate:start and agent:delegate:end events', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }

    const adapter = createCallCountAdapter([
      [
        { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"research AI"}' } },
        { type: 'done' },
      ],
      [
        { type: 'text', content: 'found papers' },
        { type: 'done' },
      ],
      [
        { type: 'text', content: 'Done.' },
        { type: 'done' },
      ],
    ])

    const runtime = createRuntime({
      adapter,
      delegates: { researcher: { skill: researcherSkill } },
      observers: [obs],
    })

    await runtime.run('Research')

    const startEvent = events.find(e => e.type === 'agent:delegate:start')
    const endEvent = events.find(e => e.type === 'agent:delegate:end')

    expect(startEvent).toBeDefined()
    expect(startEvent).toMatchObject({ type: 'agent:delegate:start', name: 'researcher', task: 'research AI', depth: 1 })
    expect(endEvent).toBeDefined()
    expect(endEvent).toMatchObject({ type: 'agent:delegate:end', name: 'researcher', result: 'found papers', depth: 1 })
    expect((endEvent as Extract<AgentEvent, { type: 'agent:delegate:end' }>).durationMs).toBeGreaterThanOrEqual(0)
  })

  it('child agent failure is treated as a failed tool call', async () => {
    const adapter = createCallCountAdapter([
      // Call 1: Parent delegates
      [
        { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"fail"}' } },
        { type: 'done' },
      ],
      // Call 2: Child's adapter returns error
      [
        { type: 'error', content: 'LLM error' },
      ],
      // Call 3: Parent recovers
      [
        { type: 'text', content: 'Researcher failed, proceeding anyway.' },
        { type: 'done' },
      ],
    ])

    const runtime = createRuntime({
      adapter,
      delegates: { researcher: { skill: researcherSkill } },
    })

    const result = await runtime.run('Research')

    expect(result.content).toBe('Researcher failed, proceeding anyway.')
    const delegateCall = result.toolCalls.find(tc => tc.name === 'delegate_researcher')
    expect(delegateCall?.status).toBe('error')
  })

  describe('shared context', () => {
    it('child can read shared context set by parent', async () => {
      const sharedContext = createSharedContext({ project: 'agentskit' })
      let childReadProject = ''

      const adapter = createCallCountAdapter([
        // Call 1: Parent delegates
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"check context"}' } },
          { type: 'done' },
        ],
        // Call 2: Child calls check_ctx tool
        [
          { type: 'tool_call', toolCall: { id: 'tc2', name: 'check_ctx', args: '{}' } },
          { type: 'done' },
        ],
        // Call 3: Child finishes
        [
          { type: 'text', content: 'checked' },
          { type: 'done' },
        ],
        // Call 4: Parent finishes
        [
          { type: 'text', content: 'Done.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        delegates: {
          researcher: {
            skill: researcherSkill,
            tools: [{
              name: 'check_ctx',
              execute: async () => {
                childReadProject = sharedContext.get('project') as string
                return 'context checked'
              },
            }],
          },
        },
      })

      await runtime.run('Check', { sharedContext })

      expect(childReadProject).toBe('agentskit')
    })

    it('shared context isolation: child receives readOnly view', () => {
      const ctx = createSharedContext({ key: 'value' })
      const ro = ctx.readOnly()

      expect('set' in ro).toBe(false)
      expect(ro.get('key')).toBe('value')

      ctx.set('key', 'updated')
      expect(ro.get('key')).toBe('updated')
    })
  })

  describe('delegation depth', () => {
    it('stops generating delegate tools beyond maxDelegationDepth', async () => {
      const adapter = createCallCountAdapter([
        // Call 1: Parent delegates (depth 0)
        [
          { type: 'tool_call', toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"go deeper"}' } },
          { type: 'done' },
        ],
        // Call 2: Child responds (depth 1 = maxDepth, no delegate tools available)
        [
          { type: 'text', content: 'child result' },
          { type: 'done' },
        ],
        // Call 3: Parent finishes
        [
          { type: 'text', content: 'Done.' },
          { type: 'done' },
        ],
      ])

      const runtime = createRuntime({
        adapter,
        delegates: { researcher: { skill: researcherSkill } },
        maxDelegationDepth: 1,
      })

      const result = await runtime.run('delegate')

      const delegateCall = result.toolCalls.find(tc => tc.name === 'delegate_researcher')
      expect(delegateCall?.status).toBe('complete')
      expect(delegateCall?.result).toBe('child result')
    })
  })

  it('RunOptions delegates override RuntimeConfig delegates', async () => {
    const alternativeSkill: SkillDefinition = {
      name: 'alt-researcher',
      description: 'Alternative researcher',
      systemPrompt: 'You are an alternative researcher.',
    }

    let childSystemPrompt = ''
    let callCount = 0

    const adapter = {
      createSource: (request: { messages: Array<{ role: string; content: string }> }) => {
        callCount++
        if (callCount === 2) {
          const sysMsg = request.messages.find((m: { role: string }) => m.role === 'system')
          if (sysMsg) childSystemPrompt = sysMsg.content
        }
        const chunks = callCount === 1
          ? [
              { type: 'tool_call' as const, toolCall: { id: 'tc1', name: 'delegate_researcher', args: '{"task":"research"}' } },
              { type: 'done' as const },
            ]
          : [
              { type: 'text' as const, content: 'done' },
              { type: 'done' as const },
            ]
        let aborted = false
        return {
          stream: async function* () {
            for (const chunk of chunks) {
              if (aborted) return
              yield chunk
            }
          },
          abort: () => { aborted = true },
        }
      },
    }

    const runtime = createRuntime({
      adapter,
      delegates: { researcher: { skill: researcherSkill } },
    })

    await runtime.run('go', {
      delegates: { researcher: { skill: alternativeSkill } },
    })

    expect(childSystemPrompt).toBe('You are an alternative researcher.')
  })
})
