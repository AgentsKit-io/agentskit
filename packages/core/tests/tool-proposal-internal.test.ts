import { describe, expect, it } from 'vitest'
import * as publicProposal from '../src/tool-proposal'

describe('tool proposal public surface', () => {
  it('does not expose controller authority internals', () => {
    expect(Object.keys(publicProposal)).toEqual(['proposeToolCall'])
  })
})
