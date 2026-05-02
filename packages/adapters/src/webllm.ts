import { AdapterError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'

/**
 * Browser-only adapter backed by WebLLM (https://github.com/mlc-ai/web-llm).
 * Models run on-device via WebGPU; no network for inference. The MLCEngine
 * is loaded lazily on first stream so apps can ship the import without
 * paying the wasm cost up front.
 *
 * `@mlc-ai/web-llm` is an **optional peer dependency** — install it
 * alongside this package when you opt into browser-only inference.
 */

export interface WebLlmConfig {
  /** Model id from MLC's catalog, e.g. `Llama-3.1-8B-Instruct-q4f16_1-MLC`. */
  model: string
  /**
   * Override the engine to inject a pre-loaded one (the MLCEngine spin-up
   * is non-trivial — apps usually warm it once, not per turn).
   */
  engine?: WebLlmEngineLike
  /** Engine progress callback (model download / compile percent). */
  onProgress?: (info: { progress: number; text: string }) => void
}

export interface WebLlmEngineLike {
  reload(model: string, opts?: { initProgressCallback?: (i: { progress: number; text: string }) => void }): Promise<void>
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: string; content: string }>
        stream: true
      }): AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>
    }
  }
}

interface WebLlmModule {
  CreateMLCEngine(model: string, opts?: { initProgressCallback?: (i: { progress: number; text: string }) => void }): Promise<WebLlmEngineLike>
}

let cachedSdk: Promise<WebLlmModule> | null = null
async function loadSdk(): Promise<WebLlmModule> {
  if (!cachedSdk) {
    cachedSdk = (async () => {
      try {
        const moduleId = '@mlc-ai/web-llm'
        return (await import(/* @vite-ignore */ moduleId)) as unknown as WebLlmModule
      } catch {
        throw new AdapterError({
          code: ErrorCodes.AK_ADAPTER_MISSING,
          message: 'Install @mlc-ai/web-llm to use the webllm adapter: npm install @mlc-ai/web-llm',
          hint: 'webllm is browser-only and depends on the optional peer @mlc-ai/web-llm.',
        })
      }
    })()
  }
  return cachedSdk
}

export function webllm(config: WebLlmConfig): AdapterFactory {
  let enginePromise: Promise<WebLlmEngineLike> | null = null
  const getEngine = (): Promise<WebLlmEngineLike> => {
    if (config.engine) return Promise.resolve(config.engine)
    if (!enginePromise) {
      enginePromise = (async () => {
        const sdk = await loadSdk()
        return sdk.CreateMLCEngine(config.model, { initProgressCallback: config.onProgress })
      })()
    }
    return enginePromise
  }

  return {
    capabilities: {
      streaming: true,
      tools: false,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      let aborted = false

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (aborted) return
          try {
            const engine = await getEngine()
            const messages = request.messages.map(m => ({ role: m.role, content: m.content }))
            const completion = await engine.chat.completions.create({ messages, stream: true })
            for await (const chunk of completion) {
              if (aborted) return
              const delta = chunk.choices[0]?.delta?.content
              if (delta) yield { type: 'text', content: delta }
            }
            yield { type: 'done' }
          } catch (err) {
            yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
          }
        },
        abort: () => { aborted = true },
      }
    },
  }
}

export const webllmAdapter = webllm
