import type { Observer } from '@agentskit/core'

export interface LangfuseConfig {
  publicKey?: string
  secretKey?: string
  baseUrl?: string
  release?: string
  environment?: string
  sessionId?: string
  userId?: string
  tags?: string[]
  /** Positive integer. Default 15. */
  flushAt?: number
  /** Finite positive interval in ms. Default 1000. */
  flushInterval?: number
  /** Optional error sink; throws/rejections are isolated. */
  onError?: (error: unknown) => void | Promise<void>
}

export interface LangfuseObserver extends Observer {
  flush: () => Promise<void>
  shutdown: () => Promise<void>
}

export interface LangfuseTrace {
  id: string
  update(params: Record<string, unknown>): LangfuseTrace
  span(params: Record<string, unknown>): LangfuseSpan
  generation(params: Record<string, unknown>): LangfuseSpan
  event(params: Record<string, unknown>): unknown
}

export interface LangfuseSpan {
  id: string
  end(params?: Record<string, unknown>): unknown
  update(params: Record<string, unknown>): LangfuseSpan
  span?(params: Record<string, unknown>): LangfuseSpan
  generation?(params: Record<string, unknown>): LangfuseSpan
}

export interface LangfuseClient {
  trace(params: Record<string, unknown>): LangfuseTrace
  flushAsync(): Promise<void>
  shutdownAsync(): Promise<void>
}

export interface RunRemoteState {
  tracePromise: Promise<LangfuseTrace | null> | null
  spanPromises: Map<string, Promise<LangfuseSpan | null>>
}
