import { ErrorCodes, ToolError } from './errors'
import type { ToolAuthorizationContext, ToolAuthorizer, ToolCall } from './types'

export async function authorize(fn: ToolAuthorizer, call: ToolCall, context: ToolAuthorizationContext): Promise<void> {
  let decision
  try { decision = await fn(call, context) } catch { decision = undefined }
  if (!decision?.allowed) throw new ToolError({
    code: ErrorCodes.AK_TOOL_FORBIDDEN,
    message: decision?.reason ?? `Tool "${call.name}" is not authorized`,
  })
}
