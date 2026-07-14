import type { UiEvent } from './protocol'

export interface CompleteCachedAnswer {
  events: UiEvent[]
  createdAt: number
  model: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUiEvent(value: unknown): value is UiEvent {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  if (value.type === 'text') return typeof value.delta === 'string'
  if (value.type === 'tool') {
    return typeof value.id === 'string' && typeof value.name === 'string' && isRecord(value.args)
  }
  if (value.type === 'done') return typeof value.model === 'string' && value.model.length > 0
  if (value.type === 'error') return typeof value.message === 'string'
  return false
}

export function isCompleteCachedAnswer(value: unknown): value is CompleteCachedAnswer {
  if (!isRecord(value) || !Array.isArray(value.events)) return false
  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)) return false
  if (typeof value.model !== 'string' || value.model.length === 0) return false
  if (value.events.length < 2 || !value.events.every(isUiEvent)) return false
  const terminal = value.events[value.events.length - 1]
  if (terminal?.type !== 'done' || terminal.model !== value.model) return false
  return value.events.filter((event) => event.type === 'done').length === 1
    && !value.events.some((event) => event.type === 'error')
}
