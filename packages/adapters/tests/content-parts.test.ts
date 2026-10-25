import { expect, it } from 'vitest'
import type { Message } from '@agentskit/core'
import { CapabilityUnsupportedError, providerParts } from '../src/content-parts'

it('classifies data URIs while retaining strict media validation and non-URL sources', () => {
  const message: Message = { id: 'synthetic', role: 'user', content: '', status: 'complete', createdAt: new Date(0) }
  for (const source of ['data:image/png;base64,aW1hZ2U=', 'https://example.test/image.png']) {
    expect(providerParts({ ...message, parts: [{ type: 'image', source }] }, 'openai')).toEqual([
      { type: 'image_url', image_url: { url: source } },
    ])
  }
  expect(providerParts({ ...message, parts: [{ type: 'file', source: 'file-synthetic' }] }, 'openai')).toEqual([
    { type: 'file', file: { file_id: 'file-synthetic' } },
  ])
  for (const source of ['unknown-reference', 'data:image/png;base64,invalid!', 'DATA:image/png;base64,aW1hZ2U=', 'data:image/png;base64,YQ=']) {
    expect(() => providerParts({ ...message, parts: [{ type: 'image', source }] }, 'openai')).toThrow(CapabilityUnsupportedError)
  }
  expect(() => providerParts({ ...message, parts: [{ type: 'image', source: 'data:image/png;base64,aW1hZ2U=', mimeType: 'image/jpeg' }] }, 'openai')).toThrow(CapabilityUnsupportedError)
})
