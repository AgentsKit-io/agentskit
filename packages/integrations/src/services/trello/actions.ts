import { defineAction } from '../../contract'

export const trelloListBoards = defineAction({
  name: 'trello_list_boards',
  description: 'List the open Trello boards of the authenticated member.',
  sideEffect: 'read',
  schema: { type: 'object', properties: {}, required: [] },
  async execute(_args, { http }) {
    const result = await http<Array<{ id: string; name: string; url?: string }>>({
      method: 'GET',
      path: '/1/members/me/boards',
      query: { filter: 'open', fields: 'name,url' },
    })
    return result.map((b) => ({ id: b.id, name: b.name, url: b.url }))
  },
})

export const trelloListCards = defineAction({
  name: 'trello_list_cards',
  description: 'List the open cards of a Trello board.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { board: { type: 'string', description: 'Board id.' } },
    required: ['board'],
  },
  async execute(args, { http }) {
    const result = await http<Array<{ id: string; name: string; url?: string }>>({
      method: 'GET',
      path: `/1/boards/${encodeURIComponent(String(args.board))}/cards`,
      query: { fields: 'name,url' },
    })
    return result.map((c) => ({ id: c.id, name: c.name, url: c.url }))
  },
})

export const trelloActions = [trelloListBoards, trelloListCards]
