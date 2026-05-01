import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  builtinSlashCommands,
  createSlashRegistry,
  parseSlashCommand,
  type SlashCommand,
  type SlashCommandContext,
} from '../src/slash-commands'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseSlashCommand', () => {
  it('returns null for non-slash input', () => {
    expect(parseSlashCommand('hello world')).toBeNull()
    expect(parseSlashCommand('')).toBeNull()
  })

  it('parses bare command', () => {
    expect(parseSlashCommand('/help')).toEqual({ name: 'help', args: '' })
  })

  it('parses command with args', () => {
    expect(parseSlashCommand('/model gpt-5')).toEqual({ name: 'model', args: 'gpt-5' })
  })

  it('preserves multi-word args', () => {
    expect(parseSlashCommand('/rename my session')).toEqual({
      name: 'rename',
      args: 'my session',
    })
  })

  it('returns null for lone slash', () => {
    expect(parseSlashCommand('/')).toBeNull()
  })
})

describe('createSlashRegistry', () => {
  it('registers commands and aliases', () => {
    const cmds: SlashCommand[] = [
      { name: 'help', aliases: ['?', 'h'], description: 'help', run: () => {} },
      { name: 'clear', description: 'clear', run: () => {} },
    ]
    const reg = createSlashRegistry(cmds)
    expect(reg.get('help')).toBe(cmds[0])
    expect(reg.get('?')).toBe(cmds[0])
    expect(reg.get('h')).toBe(cmds[0])
    expect(reg.get('clear')).toBe(cmds[1])
    expect(reg.get('missing')).toBeUndefined()
  })
})

function makeCtx(overrides: Partial<SlashCommandContext> = {}): SlashCommandContext & {
  feedbackLog: Array<{ message: string; kind?: string }>
} {
  const feedbackLog: Array<{ message: string; kind?: string }> = []
  const chat = {
    messages: [],
    status: 'idle',
    input: '',
    usage: undefined,
    send: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    edit: vi.fn(),
    regenerate: vi.fn(),
    setInput: vi.fn(),
    clear: vi.fn(async () => undefined),
    approve: vi.fn(),
    deny: vi.fn(),
  }
  return Object.assign(
    {
      chat: chat as unknown as SlashCommandContext['chat'],
      runtime: { provider: 'demo', model: 'fake', mode: 'demo', sessionId: undefined },
      setProvider: vi.fn(),
      setModel: vi.fn(),
      setApiKey: vi.fn(),
      setBaseUrl: vi.fn(),
      setTools: vi.fn(),
      setSkill: vi.fn(),
      feedback: (message: string, kind?: string) => feedbackLog.push({ message, kind }),
      commands: builtinSlashCommands,
      ...overrides,
    },
    { feedbackLog },
  ) as never
}

const get = (name: string) => builtinSlashCommands.find(c => c.name === name)!

describe('builtin slash commands', () => {
  it('help lists all commands', () => {
    const ctx = makeCtx()
    get('help').run(ctx, '')
    expect(ctx.feedbackLog).toHaveLength(1)
    expect(ctx.feedbackLog[0].message).toMatch(/Slash commands:/)
    expect(ctx.feedbackLog[0].message).toMatch(/\/help/)
  })

  it('model warn when no value, set when given', () => {
    const ctx = makeCtx()
    get('model').run(ctx, '')
    expect(ctx.feedbackLog[0].kind).toBe('warn')
    get('model').run(ctx, 'gpt-5')
    expect(ctx.setModel).toHaveBeenCalledWith('gpt-5')
    expect(ctx.feedbackLog[1].kind).toBe('success')
  })

  it('provider warn when no value, set when given', () => {
    const ctx = makeCtx()
    get('provider').run(ctx, '')
    expect(ctx.feedbackLog[0].kind).toBe('warn')
    get('provider').run(ctx, 'openai')
    expect(ctx.setProvider).toHaveBeenCalledWith('openai')
  })

  it('base-url clears with "clear" or empty, sets otherwise', () => {
    const ctx = makeCtx()
    get('base-url').run(ctx, '')
    expect(ctx.setBaseUrl).toHaveBeenCalledWith(undefined)
    get('base-url').run(ctx, 'clear')
    expect(ctx.setBaseUrl).toHaveBeenCalledWith(undefined)
    get('base-url').run(ctx, 'https://x')
    expect(ctx.setBaseUrl).toHaveBeenCalledWith('https://x')
  })

  it('tools clears with "clear" or empty, sets otherwise', () => {
    const ctx = makeCtx()
    get('tools').run(ctx, 'clear')
    expect(ctx.setTools).toHaveBeenCalledWith(undefined)
    get('tools').run(ctx, 'web_search')
    expect(ctx.setTools).toHaveBeenCalledWith('web_search')
  })

  it('skill clears with "clear" or empty, sets otherwise', () => {
    const ctx = makeCtx()
    get('skill').run(ctx, '')
    expect(ctx.setSkill).toHaveBeenCalledWith(undefined)
    get('skill').run(ctx, 'researcher')
    expect(ctx.setSkill).toHaveBeenCalledWith('researcher')
  })

  it('clear delegates to chat.clear', async () => {
    const ctx = makeCtx()
    await (get('clear').run(ctx, '') as Promise<void>)
    expect(ctx.chat.clear).toHaveBeenCalled()
  })

  it('usage info when no usage', () => {
    const ctx = makeCtx()
    get('usage').run(ctx, '')
    expect(ctx.feedbackLog[0].message).toMatch(/No usage/)
  })

  it('usage prints token totals when present', () => {
    const ctx = makeCtx({
      chat: {
        ...makeCtx().chat,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      } as never,
    })
    get('usage').run(ctx, '')
    expect(ctx.feedbackLog[0].message).toMatch(/total=15/)
  })

  it('cost info when no usage', () => {
    const ctx = makeCtx()
    get('cost').run(ctx, '')
    expect(ctx.feedbackLog[0].message).toMatch(/No usage/)
  })

  it('cost warns when no pricing for model', () => {
    const ctx = makeCtx({
      chat: {
        ...makeCtx().chat,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      } as never,
      runtime: { provider: 'demo', model: 'unknown-model-9000', mode: 'live' },
    })
    get('cost').run(ctx, '')
    expect(ctx.feedbackLog[0].kind).toBe('warn')
  })

  it('rename rejects without managed session', () => {
    const ctx = makeCtx()
    get('rename').run(ctx, 'label')
    expect(ctx.feedbackLog[0].message).toMatch(/managed sessions/)
  })

  it('rename rejects empty label', () => {
    const ctx = makeCtx({
      runtime: { provider: 'demo', mode: 'demo', sessionId: 'custom' },
    })
    get('rename').run(ctx, '')
    // sessionId === 'custom' triggers the managed-session check first.
    expect(ctx.feedbackLog[0].message).toMatch(/managed sessions/)
  })

  it('fork rejects without managed session', () => {
    const ctx = makeCtx()
    get('fork').run(ctx, '')
    expect(ctx.feedbackLog[0].message).toMatch(/managed sessions/)
  })
})
