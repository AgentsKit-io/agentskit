import type { ChatController, ToolCall } from './types'

type Proposal = Pick<ToolCall, 'id' | 'name' | 'args'>
/**
 * Submit a tool-call proposal to a chat controller.
 * @param controller Controller that owns the proposal flow.
 * @param proposal Proposed tool call and associated context.
 * @returns The controller's resolved tool call.
 */
export const proposeToolCall = (controller: ChatController, proposal: Proposal): Promise<ToolCall> =>
  controller.proposeToolCall(proposal)
