import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface MondayResponse<T> {
  data?: T
  errors?: Array<{ message?: string }>
  error_message?: string
}

/** monday.com returns GraphQL failures with HTTP 200; surface them as typed errors. */
function unwrap<T>(res: MondayResponse<T> | undefined): T {
  const message = res?.errors?.[0]?.message ?? res?.error_message
  if (message !== undefined || res?.data === undefined) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `monday.com request failed: ${message ?? 'empty response'}`,
    })
  }
  return res.data
}

export const mondayListBoards = defineAction({
  name: 'monday_list_boards',
  description: 'List monday.com boards visible to the token (read-only).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { limit: { type: 'number', description: 'Maximum boards to return (default 25).' } },
  },
  async execute(args, { http }) {
    const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.floor(args.limit) : 25
    const res = await http<MondayResponse<{ boards: Array<{ id: string; name: string; state: string; board_kind: string }> }>>({
      method: 'POST',
      path: '/v2',
      body: { query: `query { boards(limit: ${limit}) { id name state board_kind } }` },
    })
    return unwrap(res).boards.map((b) => ({ id: b.id, name: b.name, state: b.state, kind: b.board_kind }))
  },
})

export const mondayActions = [mondayListBoards]
