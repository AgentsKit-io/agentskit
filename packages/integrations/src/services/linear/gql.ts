import { ErrorCodes, ToolError } from '@agentskit/core'
import type { IntegrationHttp } from '../../http'

export async function linearGql<TResult>(
  http: IntegrationHttp,
  query: string,
  variables: Record<string, unknown>,
): Promise<TResult> {
  const result = await http<{ data?: TResult; errors?: Array<{ message: string }> }>({
    method: 'POST',
    path: '',
    body: { query, variables },
  })
  if (result.errors?.length) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `linear: ${result.errors.map((e) => e.message).join('; ')}`,
      hint: 'GraphQL error from Linear; check the operation + variables.',
    })
  }
  if (!result.data) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'linear: empty response' })
  }
  return result.data
}
