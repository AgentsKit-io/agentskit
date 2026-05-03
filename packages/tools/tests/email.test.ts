import { describe, expect, it, vi } from 'vitest'
import {
  email,
  emailFetch,
  emailSend,
  type EmailMessage,
  type EmailTransport,
  type ImapClient,
} from '../src/integrations/email'

const stubCtx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

function makeTransport(overrides?: Partial<EmailTransport>): { transport: EmailTransport; sent: unknown[] } {
  const sent: unknown[] = []
  const transport: EmailTransport = {
    send: vi.fn(async (msg) => {
      sent.push(msg)
      return { messageId: '<abc@local>', accepted: ['x@y.z'], rejected: [] }
    }),
    ...overrides,
  }
  return { transport, sent }
}

function makeImap(messages: EmailMessage[]): { imap: ImapClient; calls: unknown[] } {
  const calls: unknown[] = []
  const imap: ImapClient = {
    fetch: vi.fn(async (opts) => {
      calls.push(opts)
      return messages
    }),
  }
  return { imap, calls }
}

describe('emailSend', () => {
  it('throws ConfigError when transport missing', () => {
    expect(() => emailSend({})).toThrow(/transport is required/)
  })

  it('sends with normalized to as array', async () => {
    const { transport, sent } = makeTransport()
    const tool = emailSend({ transport })
    const result = (await tool.execute!(
      { from: 'a@b.c', to: 'x@y.z', subject: 'hi', text: 'hello' },
      stubCtx,
    )) as { messageId: string; accepted: string[] }
    expect(result.messageId).toBe('<abc@local>')
    expect(result.accepted).toEqual(['x@y.z'])
    expect(sent[0]).toMatchObject({ to: ['x@y.z'], subject: 'hi', text: 'hello' })
  })

  it('keeps to[] as array, forwards cc/bcc/html', async () => {
    const { transport, sent } = makeTransport()
    const tool = emailSend({ transport })
    await tool.execute!(
      {
        from: 'a@b.c',
        to: ['x@y.z', 'q@r.s'],
        cc: 'c@c.c',
        bcc: ['b@b.b'],
        subject: 'subj',
        html: '<p>hi</p>',
      },
      stubCtx,
    )
    expect(sent[0]).toMatchObject({
      to: ['x@y.z', 'q@r.s'],
      cc: ['c@c.c'],
      bcc: ['b@b.b'],
      html: '<p>hi</p>',
    })
  })

  it('rejects when both text and html missing', async () => {
    const { transport } = makeTransport()
    const tool = emailSend({ transport })
    await expect(
      tool.execute!({ from: 'a@b.c', to: 'x@y.z', subject: 's' }, stubCtx),
    ).rejects.toThrow(/text or html/)
  })

  it('rejects when to is empty array', async () => {
    const { transport } = makeTransport()
    const tool = emailSend({ transport })
    await expect(
      tool.execute!({ from: 'a@b.c', to: [], subject: 's', text: 't' }, stubCtx),
    ).rejects.toThrow(/to is required/)
  })

  it('wraps transport errors as ToolError', async () => {
    const transport: EmailTransport = {
      send: async () => {
        throw new Error('smtp 535 auth failed')
      },
    }
    const tool = emailSend({ transport })
    await expect(
      tool.execute!({ from: 'a@b.c', to: 'x@y.z', subject: 's', text: 't' }, stubCtx),
    ).rejects.toThrow(/email_send: smtp 535 auth failed/)
  })

  it('forwards attachments through', async () => {
    const { transport, sent } = makeTransport()
    const tool = emailSend({ transport })
    await tool.execute!(
      {
        from: 'a@b.c',
        to: 'x@y.z',
        subject: 's',
        text: 't',
        attachments: [{ filename: 'r.txt', content: 'hi' }],
      },
      stubCtx,
    )
    expect(sent[0]).toMatchObject({ attachments: [{ filename: 'r.txt', content: 'hi' }] })
  })

  it('sets requiresConfirmation: true', () => {
    const { transport } = makeTransport()
    const tool = emailSend({ transport })
    expect(tool.requiresConfirmation).toBe(true)
  })
})

describe('emailFetch', () => {
  const sample: EmailMessage = {
    id: 'm1',
    uid: 1,
    from: 'a@b.c',
    to: ['me@me.me'],
    subject: 'hello',
    date: '2026-01-01T00:00:00.000Z',
    text: 'hi',
  }

  it('throws ConfigError when imap missing', () => {
    expect(() => emailFetch({})).toThrow(/imap is required/)
  })

  it('passes filter through and uses default mailbox', async () => {
    const { imap, calls } = makeImap([sample])
    const tool = emailFetch({ imap })
    const result = (await tool.execute!(
      { unseen_only: true, from: 'a@b.c' },
      stubCtx,
    )) as { count: number; messages: EmailMessage[] }
    expect(result.count).toBe(1)
    expect(result.messages[0]).toEqual(sample)
    expect(calls[0]).toMatchObject({ mailbox: 'INBOX', unseenOnly: true, from: 'a@b.c', limit: 50 })
  })

  it('respects custom mailbox + maxFetch cap', async () => {
    const { imap, calls } = makeImap([sample])
    const tool = emailFetch({ imap, defaultMailbox: 'Updates', maxFetch: 10 })
    await tool.execute!({ limit: 1000 }, stubCtx)
    expect(calls[0]).toMatchObject({ mailbox: 'Updates', limit: 10 })
  })

  it('reports truncated when result count >= limit', async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...sample, id: `m${i}`, uid: i }))
    const { imap } = makeImap(many)
    const tool = emailFetch({ imap, maxFetch: 5 })
    const result = (await tool.execute!({ limit: 5 }, stubCtx)) as { truncated: boolean }
    expect(result.truncated).toBe(true)
  })
})

describe('email()', () => {
  it('returns send + fetch when both adapters provided', () => {
    const { transport } = makeTransport()
    const { imap } = makeImap([])
    const tools = email({ transport, imap })
    expect(tools.map(t => t.name)).toEqual(['email_send', 'email_fetch'])
  })

  it('returns only send when imap missing', () => {
    const { transport } = makeTransport()
    expect(email({ transport }).map(t => t.name)).toEqual(['email_send'])
  })

  it('returns only fetch when transport missing', () => {
    const { imap } = makeImap([])
    expect(email({ imap }).map(t => t.name)).toEqual(['email_fetch'])
  })

  it('throws when neither adapter provided', () => {
    expect(() => email({})).toThrow(/at least one/)
  })
})
