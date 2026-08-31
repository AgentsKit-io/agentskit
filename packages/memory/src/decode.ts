import { deserializeMessages, ErrorCodes, MemoryError } from '@agentskit/core'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import type { Message } from '@agentskit/core'

export function decodeStoredMessages(json: string, backend: string): Message[] {
  try {
    return deserializeMessages(validateMemoryRecord(JSON.parse(json) as unknown))
  } catch (cause) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_DESERIALIZE_FAILED,
      message: `${backend} returned an invalid message record.`,
      hint: 'Repair or remove the corrupted record before loading it again.',
      cause,
    })
  }
}
