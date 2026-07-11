import { ConfigError, ErrorCodes } from './errors'
import type { MemoryRecord } from './types'

const MAX_JSON_DEPTH = 32
const MAX_JSON_NODES = 10_000
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

function assertJsonValue(root: unknown): void {
  const active = new WeakSet<object>()
  const stack: Array<{ value: unknown; depth: number; exit?: boolean }> = [{ value: root, depth: 0 }]
  let nodes = 0

  while (stack.length > 0) {
    const item = stack.pop()!
    const value = item.value
    if (item.exit) {
      active.delete(value as object)
      continue
    }
    if (++nodes > MAX_JSON_NODES || item.depth > MAX_JSON_DEPTH) invalidRecord()
    if (value === null || typeof value === 'string' || typeof value === 'boolean') continue
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) invalidRecord()
      continue
    }
    if (!Array.isArray(value) && !isRecord(value)) invalidRecord()
    if (active.has(value)) invalidRecord()
    active.add(value)
    stack.push({ value, depth: item.depth, exit: true })
    const children = Array.isArray(value) ? value : Object.values(value)
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ value: children[index], depth: item.depth + 1 })
    }
  }
}

function optionalString(record: Record<string, unknown>, key: string): void {
  if (record[key] !== undefined && typeof record[key] !== 'string') invalidRecord()
}

function validatePart(value: unknown): void {
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

function validateToolCall(value: unknown): void {
  if (!isRecord(value)) invalidRecord()
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || !isRecord(value.args)) invalidRecord()
  if (typeof value.status !== 'string' || !toolStatuses.has(value.status)) invalidRecord()
  optionalString(value, 'result')
  optionalString(value, 'error')
}

function validateMessage(value: unknown): void {
  if (!isRecord(value)) invalidRecord()
  if (typeof value.id !== 'string' || typeof value.content !== 'string') invalidRecord()
  if (typeof value.role !== 'string' || !roles.has(value.role)) invalidRecord()
  if (typeof value.status !== 'string' || !messageStatuses.has(value.status)) invalidRecord()
  if (typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt)) invalidRecord()
  if (Number.isNaN(Date.parse(value.createdAt))) invalidRecord()
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

export function validateMemoryRecord(input: unknown): MemoryRecord {
  assertJsonValue(input)
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.messages)) invalidRecord()
  input.messages.forEach(validateMessage)
  return input as unknown as MemoryRecord
}
