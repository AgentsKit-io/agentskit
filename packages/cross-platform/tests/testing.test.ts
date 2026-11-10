import { access, readFile, writeFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createFetchStub, jsonResponse, withTempDir } from '../src/testing'

describe('@agentskit/cross-platform/testing', () => {
  it('forwards fetch input and init through a typed stub', async () => {
    const response = new Response('ok')
    const fetchStub = createFetchStub((url, init) => {
      expect(url).toBe('https://example.test/data')
      expect(init?.method).toBe('POST')
      return response
    })

    await expect(fetchStub('https://example.test/data', { method: 'POST' })).resolves.toBe(response)
  })

  it('builds JSON responses with a default content type and caller headers', async () => {
    const response = jsonResponse({ ok: true }, { status: 201, headers: { 'x-test': 'yes' } })

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('x-test')).toBe('yes')
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('removes the temporary directory after callback success and failure', async () => {
    let successfulPath = ''
    const value = await withTempDir(async (directory) => {
      successfulPath = directory
      await writeFile(`${directory}/test.txt`, 'ok')
      return readFile(`${directory}/test.txt`, 'utf8')
    })

    expect(value).toBe('ok')
    await expect(access(successfulPath)).rejects.toThrow()

    let failedPath = ''
    await expect(withTempDir(async (directory) => {
      failedPath = directory
      throw new Error('callback failed')
    })).rejects.toThrow('callback failed')
    await expect(access(failedPath)).rejects.toThrow()
  })
})
