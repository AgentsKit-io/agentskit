import { ConfigError, ErrorCodes } from './errors'
import { cloneJsonRecord } from './json-validation'
import type { ContentPart } from './types/content'
import type { MemoryRecord } from './types/message'
import type { ToolCall } from './types/tool'

type SerializedMessage = MemoryRecord['messages'][number]

const roles = new Set(['user', 'assistant', 'system', 'tool'])
const messageStatuses = new Set(['pending', 'streaming', 'complete', 'error'])
const toolStatuses = new Set(['pending', 'running', 'complete', 'error', 'requires_confirmation'])
const partTypes = new Set(['text', 'image', 'audio', 'video', 'file'])

function invalidRecord(): never {
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message: 'Serialized message record is invalid.',
    hint: 'Pass a version 1 MemoryRecord produced by serializeMessages().',
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value) as unknown
  return prototype === Object.prototype || prototype === null
}

function optionalString(record: Record<string, unknown>, key: string): void {
  if (record[key] !== undefined && typeof record[key] !== 'string') invalidRecord()
}

function validatePart(value: unknown): asserts value is ContentPart {
  if (!isRecord(value) || typeof value.type !== 'string' || !partTypes.has(value.type)) invalidRecord()
  if (value.type === 'text') {
    if (typeof value.text !== 'string') invalidRecord()
    return
  }
  if (typeof value.source !== 'string') invalidRecord()
  optionalString(value, 'mimeType')
  if (value.type === 'image' && value.detail !== undefined && !['low', 'high', 'auto'].includes(String(value.detail))) invalidRecord()
  if ((value.type === 'audio' || value.type === 'video') && value.durationSec !== undefined) {
    if (typeof value.durationSec !== 'number' || !Number.isFinite(value.durationSec) || value.durationSec < 0) invalidRecord()
  }
  if (value.type === 'file') optionalString(value, 'filename')
}

function validateToolCall(value: unknown): asserts value is ToolCall {
  if (!isRecord(value)) invalidRecord()
  if (typeof value.id !== 'string' || value.id.length === 0) invalidRecord()
  if (typeof value.name !== 'string' || value.name.length === 0 || !isRecord(value.args)) invalidRecord()
  if (typeof value.status !== 'string' || !toolStatuses.has(value.status)) invalidRecord()
  optionalString(value, 'result')
  optionalString(value, 'error')
}

function validateMessage(value: unknown): asserts value is SerializedMessage {
  if (!isRecord(value)) invalidRecord()
  if (typeof value.id !== 'string' || value.id.length === 0 || typeof value.content !== 'string') invalidRecord()
  if (typeof value.role !== 'string' || !roles.has(value.role)) invalidRecord()
  if (typeof value.status !== 'string' || !messageStatuses.has(value.status)) invalidRecord()
  if (typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt)) invalidRecord()
  const timestamp = Date.parse(value.createdAt)
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString() !== value.createdAt) invalidRecord()
  optionalString(value, 'toolCallId')
  if (value.parts !== undefined) {
    if (!Array.isArray(value.parts)) invalidRecord()
    value.parts.forEach(validatePart)
  }
  if (value.toolCalls !== undefined) {
    if (!Array.isArray(value.toolCalls)) invalidRecord()
    value.toolCalls.forEach(validateToolCall)
  }
  if (value.metadata !== undefined && !isRecord(value.metadata)) invalidRecord()
}

function projectPart(part: ContentPart): ContentPart {
  switch (part.type) {
    case 'text': return { type: 'text', text: part.text }
    case 'image': return {
      type: 'image', source: part.source,
      ...(part.mimeType === undefined ? {} : { mimeType: part.mimeType }),
      ...(part.detail === undefined ? {} : { detail: part.detail }),
    }
    case 'audio': return {
      type: 'audio', source: part.source,
      ...(part.mimeType === undefined ? {} : { mimeType: part.mimeType }),
      ...(part.durationSec === undefined ? {} : { durationSec: part.durationSec }),
    }
    case 'video': return {
      type: 'video', source: part.source,
      ...(part.mimeType === undefined ? {} : { mimeType: part.mimeType }),
      ...(part.durationSec === undefined ? {} : { durationSec: part.durationSec }),
    }
    case 'file': return {
      type: 'file', source: part.source,
      ...(part.mimeType === undefined ? {} : { mimeType: part.mimeType }),
      ...(part.filename === undefined ? {} : { filename: part.filename }),
    }
  }
}

function projectToolCall(call: ToolCall): ToolCall {
  return {
    id: call.id,
    name: call.name,
    args: call.args,
    status: call.status,
    ...(call.result === undefined ? {} : { result: call.result }),
    ...(call.error === undefined ? {} : { error: call.error }),
  }
}

function projectMessage(message: SerializedMessage): SerializedMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    createdAt: message.createdAt,
    ...(message.parts === undefined ? {} : { parts: message.parts.map(projectPart) }),
    ...(message.toolCalls === undefined ? {} : { toolCalls: message.toolCalls.map(projectToolCall) }),
    ...(message.toolCallId === undefined ? {} : { toolCallId: message.toolCallId }),
    ...(message.metadata === undefined ? {} : { metadata: message.metadata }),
  }
}

export function validateMemoryRecord(input: unknown): MemoryRecord {
  const snapshot = cloneJsonRecord(input, invalidRecord, Infinity, false)
  if (snapshot.version !== 1 || !Array.isArray(snapshot.messages)) invalidRecord()
  const messages = snapshot.messages.map(message => {
    validateMessage(message)
    return projectMessage(message)
  })
  return { version: 1, messages }
}
