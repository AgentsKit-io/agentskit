import { camelCase, pascalCase } from './utils'

export function generateAdapterSource(name: string): string {
  return `import type { AdapterFactory, StreamChunk } from '@agentskit/core'

export interface ${pascalCase(name)}Config {
  apiKey: string
  model?: string
  baseUrl?: string
}

export function ${camelCase(name)}(config: ${pascalCase(name)}Config): AdapterFactory {
  return {
    createSource: (request) => {
      let abortController: AbortController | null = new AbortController()

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          try {
            // TODO: implement API call
            // const response = await fetch(config.baseUrl + '/v1/chat', {
            //   method: 'POST',
            //   headers: { Authorization: \\\`Bearer \\\${config.apiKey}\\\` },
            //   body: JSON.stringify({ model: config.model, messages: request.messages }),
            //   signal: abortController?.signal,
            // })

            yield { type: 'text', content: 'TODO: implement streaming' }
            yield { type: 'done' }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            const error = err instanceof Error ? err : new Error(String(err))
            yield { type: 'error', content: error.message, metadata: { error } }
          }
        },
        abort: () => {
          abortController?.abort()
          abortController = null
        },
      }
    },
  }
}
`
}

export function generateAdapterTest(name: string): string {
  return `import { describe, it, expect } from 'vitest'
import { ${camelCase(name)} } from '../src/index'

describe('${name}', () => {
  it('satisfies AdapterFactory contract', () => {
    const adapter = ${camelCase(name)}({ apiKey: 'test' })
    expect(adapter.createSource).toBeTypeOf('function')
  })
})
`
}
