import { describe, expect, it, vi } from 'vitest'
import { teamsAdapter, type TeamsServiceClient } from '../src/adapter'

const stubClient: TeamsServiceClient = { sendMessage: vi.fn(async () => {}) }

describe('teamsAdapter — verify', () => {
  it('rejects when Authorization header is missing', async () => {
    const a = teamsAdapter({ serviceClient: stubClient, verifyToken: async () => true })
    expect(await a.verify!({ headers: {}, body: {} })).toBe(false)
  })

  it('rejects when Authorization is not a Bearer token', async () => {
    const a = teamsAdapter({ serviceClient: stubClient, verifyToken: async () => true })
    expect(
      await a.verify!({ headers: { authorization: 'Basic xyz' }, body: {} }),
    ).toBe(false)
  })

  it('default verifyToken refuses everything (deny by default)', async () => {
    const a = teamsAdapter({ serviceClient: stubClient })
    expect(
      await a.verify!({
        headers: { authorization: 'Bearer eyJ.x.y' },
        body: {},
      }),
    ).toBe(false)
  })

  it('passes Bearer token + request to verifyToken callback', async () => {
    const verifyToken = vi.fn(async () => true)
    const a = teamsAdapter({ serviceClient: stubClient, verifyToken })
    const ok = await a.verify!({
      headers: { authorization: 'Bearer abc.def.ghi' },
      body: { hi: true },
    })
    expect(ok).toBe(true)
    expect(verifyToken).toHaveBeenCalledWith(
      'abc.def.ghi',
      expect.objectContaining({ headers: expect.any(Object), body: { hi: true } }),
    )
  })
})

describe('teamsAdapter — parse', () => {
  const a = teamsAdapter({ serviceClient: stubClient, verifyToken: async () => true })

  it('normalizes message → message event', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'message',
        id: 'A1',
        timestamp: '2026-01-01T00:00:00.000Z',
        conversation: { id: 'C1' },
        from: { id: 'U1', name: 'alice' },
        text: 'hi bot',
      },
    }) as { type: string; text: string; receivedAt: string; user: { name: string } }
    expect(r.type).toBe('message')
    expect(r.text).toBe('hi bot')
    expect(r.receivedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(r.user.name).toBe('alice')
  })

  it('normalizes message with replyToId → reply event', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'message',
        id: 'A2',
        conversation: { id: 'C1' },
        from: { id: 'U1' },
        text: 'thread reply',
        replyToId: 'A1',
      },
    }) as { type: string; parentId: string }
    expect(r.type).toBe('reply')
    expect(r.parentId).toBe('A1')
  })

  it('normalizes message with attachment → file_upload', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'message',
        id: 'A3',
        conversation: { id: 'C1' },
        from: { id: 'U1' },
        attachments: [{ name: 'r.pdf', contentType: 'application/pdf', contentUrl: 'https://x' }],
      },
    }) as { type: string; name: string }
    expect(r.type).toBe('file_upload')
    expect(r.name).toBe('r.pdf')
  })

  it('normalizes messageReaction (added)', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'messageReaction',
        id: 'A4',
        conversation: { id: 'C1' },
        from: { id: 'U1' },
        replyToId: 'A1',
        reactionsAdded: [{ type: 'like' }],
      },
    }) as { type: string; emoji: string; added: boolean; messageId: string }
    expect(r.type).toBe('reaction')
    expect(r.emoji).toBe('like')
    expect(r.added).toBe(true)
    expect(r.messageId).toBe('A1')
  })

  it('normalizes conversationUpdate.membersAdded → installation installed', () => {
    const r = a.parse({
      headers: {},
      body: {
        type: 'conversationUpdate',
        id: 'A5',
        conversation: { id: 'C1' },
        from: { id: 'U1', aadObjectId: 'TEN1' },
        membersAdded: [{ id: 'BOT' }],
      },
    }) as { type: string; action: string; tenantId: string }
    expect(r.type).toBe('installation')
    expect(r.action).toBe('installed')
    expect(r.tenantId).toBe('TEN1')
  })

  it('returns null for typing / invoke / unknown activities', () => {
    expect(
      a.parse({
        headers: {},
        body: { type: 'typing', conversation: { id: 'C1' }, from: { id: 'U1' } },
      }),
    ).toBeNull()
  })
})

describe('teamsAdapter — reply', () => {
  it('threads serviceUrl from parse → reply via the injected serviceClient', async () => {
    const sendMessage = vi.fn(async () => {})
    const a = teamsAdapter({ serviceClient: { sendMessage }, verifyToken: async () => true })
    a.parse({
      headers: {},
      body: {
        type: 'message',
        id: 'A1',
        serviceUrl: 'https://smba.trafficmanager.net/eu/',
        conversation: { id: 'C1' },
        from: { id: 'U1' },
        text: 'hi',
      },
    })
    await a.reply!(
      {
        type: 'message',
        surface: 'teams',
        eventId: 'A1',
        channel: { id: 'C1' },
        user: { id: 'U1' },
        text: 'hi',
      },
      'reply',
    )
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'C1',
        text: 'reply',
        serviceUrl: 'https://smba.trafficmanager.net/eu/',
      }),
    )
  })

  it('refuses to reply when no serviceUrl was captured', async () => {
    const sendMessage = vi.fn(async () => {})
    const a = teamsAdapter({ serviceClient: { sendMessage }, verifyToken: async () => true })
    await expect(
      a.reply!(
        { type: 'message', surface: 'teams', eventId: 'NEVER-SEEN', channel: { id: 'C1' }, user: { id: 'U1' }, text: 'x' },
        'reply',
      ),
    ).rejects.toThrow(/no serviceUrl/)
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('evicts serviceUrl after one reply', async () => {
    const sendMessage = vi.fn(async () => {})
    const a = teamsAdapter({ serviceClient: { sendMessage }, verifyToken: async () => true })
    a.parse({
      headers: {},
      body: { type: 'message', id: 'A1', serviceUrl: 'https://x', conversation: { id: 'C1' }, from: { id: 'U1' } },
    })
    const event = { type: 'message' as const, surface: 'teams' as const, eventId: 'A1', channel: { id: 'C1' }, user: { id: 'U1' }, text: 'x' }
    await a.reply!(event, 'first')
    await expect(a.reply!(event, 'second')).rejects.toThrow(/no serviceUrl/)
  })
})
