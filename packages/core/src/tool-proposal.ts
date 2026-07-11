import type { ChatController, ToolCall } from './types'

type Proposal = Pick<ToolCall, 'id' | 'name' | 'args'>
export const proposeToolCall = (controller: ChatController, proposal: Proposal): Promise<ToolCall> =>
  controller.proposeToolCall(proposal)
