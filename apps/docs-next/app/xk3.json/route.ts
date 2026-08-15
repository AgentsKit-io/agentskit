import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const POSTHOG_HOST = 'https://us.i.posthog.com'

async function proxy(request: NextRequest): Promise<Response> {
  const upstream = new URL('/capture/', POSTHOG_HOST)
  upstream.search = request.nextUrl.search

  const headers = new Headers(request.headers)
  headers.delete('content-length')
  headers.delete('host')

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    cache: 'no-store',
  })

  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete('content-length')
  responseHeaders.delete('content-encoding')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const HEAD = proxy
export const OPTIONS = proxy
export const POST = proxy
