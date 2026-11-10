import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { removePath } from './fs'
import { tempDir } from './env'

/** Handler used by {@link createFetchStub} when stubbing fetch procedurally. */
export type FetchStubHandler<TResponse = Response> = (
  url: string,
  init?: RequestInit,
) => TResponse | Promise<TResponse>

/** URL → response body or Response map accepted by {@link createFetchStub}. */
export type FetchStubResponses = Readonly<Record<string, string | Response>>

/** Create a fetch-shaped stub that forwards each URL and init to a handler. */
export function createFetchStub<TResponse = Response>(
  handler: FetchStubHandler<TResponse>,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<TResponse>
/** Create a fetch stub from URL → body/Response entries; unknown URLs return 404. */
export function createFetchStub(
  responses: FetchStubResponses,
  fallback?: Response,
): typeof fetch
export function createFetchStub<TResponse = Response>(
  source: FetchStubHandler<TResponse> | FetchStubResponses,
  fallback: Response = new Response('Not Found', { status: 404 }),
): ((input: RequestInfo | URL, init?: RequestInit) => Promise<TResponse>) | typeof fetch {
  if (typeof source === 'function') {
    return async (input, init) => source(input instanceof Request ? input.url : String(input), init)
  }
  return async (input) => {
    const url = input instanceof Request ? input.url : String(input)
    const response = source[url]
    if (response === undefined) return fallback.clone()
    return response instanceof Response ? response.clone() : new Response(response)
  }
}

/** Create a JSON Response with an application/json content type by default. */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

/**
 * Run work in a unique temporary directory and remove it when the callback
 * resolves or throws. The prefix is passed to the platform's native mkdtemp.
 */
export async function withTempDir<T>(
  callback: (directory: string) => T | Promise<T>,
  prefix = 'agentskit-test-',
): Promise<T> {
  const directory = await mkdtemp(join(tempDir(), prefix))
  try {
    return await callback(directory)
  } finally {
    await removePath(directory)
  }
}
