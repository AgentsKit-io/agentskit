import { describe, it, expect } from 'vitest'
import { AgentsKitError } from '@agentskit/core'
import { RagError, RagErrorCodes } from '../src/errors'

describe('RagError', () => {
  it('extends the core AgentsKitError family', () => {
    const err = new RagError({ code: RagErrorCodes.AK_RAG_LOAD_FAILED, message: 'boom' })
    expect(err).toBeInstanceOf(AgentsKitError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('RagError')
  })

  it('carries the code and message', () => {
    const err = new RagError({ code: RagErrorCodes.AK_RAG_RERANK_FAILED, message: 'voyage rerank: 500' })
    expect(err.code).toBe('AK_RAG_RERANK_FAILED')
    expect(err.message).toBe('voyage rerank: 500')
  })

  it('supports an optional hint for peer-missing errors', () => {
    const err = new RagError({
      code: RagErrorCodes.AK_RAG_PEER_MISSING,
      message: 'Install @aws-sdk/client-s3',
      hint: 'optional peer',
    })
    expect(err.code).toBe('AK_RAG_PEER_MISSING')
    expect(err.hint).toBe('optional peer')
  })

  it('exposes exactly the three documented codes', () => {
    expect(Object.values(RagErrorCodes).sort()).toEqual([
      'AK_RAG_LOAD_FAILED',
      'AK_RAG_PEER_MISSING',
      'AK_RAG_RERANK_FAILED',
    ])
  })
})
