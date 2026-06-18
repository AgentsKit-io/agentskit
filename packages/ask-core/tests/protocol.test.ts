import { describe, expect, it } from 'vitest'
import {
  RENDERABLE_TOOL_NAMES,
  UI_TOOL_NAMES,
  decodeEvents,
  encodeEvent,
  isUiTool,
  type UiEvent,
} from '../src/protocol'

describe('protocol', () => {
  it('encodes/decodes NDJSON UiEvents round-trip', () => {
    const ev: UiEvent = { type: 'text', delta: 'hi' }
    const { events, rest } = decodeEvents(encodeEvent(ev))
    expect(events).toEqual([ev])
    expect(rest).toBe('')
  })

  it('allow-lists model tools (no answer) but renders the server answer', () => {
    expect(isUiTool('cite')).toBe(true)
    expect(isUiTool('answer')).toBe(false) // model can't call answer
    expect(UI_TOOL_NAMES.has('answer')).toBe(false)
    expect(RENDERABLE_TOOL_NAMES.has('answer')).toBe(true) // server-emitted, widget renders it
  })
})
