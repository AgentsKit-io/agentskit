import { describe, expectTypeOf, it } from 'vitest'
import type {
  LangfuseClient,
  LangfuseConfig,
  LangfuseObserver,
  LangfuseSpan,
  LangfuseTrace,
  RunRemoteState,
} from '../src/langfuse-types'
import type { Observer } from '@agentskit/core'

describe('langfuse type contracts', () => {
  it('LangfuseConfig accepts env-style credentials and optional flush knobs', () => {
    const config: LangfuseConfig = {
      publicKey: 'pk',
      secretKey: 'sk',
      baseUrl: 'https://cloud.langfuse.com',
      release: '1.0.0',
      environment: 'test',
      sessionId: 'sess',
      userId: 'user',
      tags: ['agentskit'],
      flushAt: 15,
      flushInterval: 1000,
      onError: (error) => {
        expectTypeOf(error).toEqualTypeOf<unknown>()
      },
    }
    expectTypeOf(config.publicKey).toEqualTypeOf<string | undefined>()
    expectTypeOf(config.flushAt).toEqualTypeOf<number | undefined>()
    expectTypeOf(config.onError).toEqualTypeOf<
      ((error: unknown) => void | Promise<void>) | undefined
    >()
  })

  it('LangfuseObserver extends Observer with flush and shutdown lifecycle', () => {
    const observer: LangfuseObserver = {
      name: 'langfuse',
      on: () => {},
      flush: async () => {},
      shutdown: async () => {},
    }
    expectTypeOf(observer).toMatchTypeOf<Observer>()
    expectTypeOf(observer.flush).returns.toEqualTypeOf<Promise<void>>()
    expectTypeOf(observer.shutdown).returns.toEqualTypeOf<Promise<void>>()
  })

  it('LangfuseTrace exposes id, update, span, generation, and event', () => {
    const trace: LangfuseTrace = {
      id: 't1',
      update: (params) => {
        expectTypeOf(params).toEqualTypeOf<Record<string, unknown>>()
        return trace
      },
      span: () => span,
      generation: () => span,
      event: () => null,
    }
    const span: LangfuseSpan = {
      id: 's1',
      end: () => null,
      update: () => span,
      span: () => span,
      generation: () => span,
    }
    expectTypeOf(trace.id).toBeString()
    expectTypeOf(trace.span).parameter(0).toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf(span.end).parameter(0).toEqualTypeOf<Record<string, unknown> | undefined>()
  })

  it('LangfuseClient requires trace + async flush/shutdown', () => {
    const client: LangfuseClient = {
      trace: () => ({
        id: 't',
        update: () => client.trace({}),
        span: () => ({
          id: 's',
          end: () => null,
          update() {
            return this
          },
        }),
        generation: () => ({
          id: 'g',
          end: () => null,
          update() {
            return this
          },
        }),
        event: () => null,
      }),
      flushAsync: async () => {},
      shutdownAsync: async () => {},
    }
    expectTypeOf(client.trace).parameter(0).toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf(client.flushAsync).returns.toEqualTypeOf<Promise<void>>()
    expectTypeOf(client.shutdownAsync).returns.toEqualTypeOf<Promise<void>>()
  })

  it('RunRemoteState tracks pending trace and span promises', () => {
    const state: RunRemoteState = {
      tracePromise: null,
      spanPromises: new Map(),
    }
    expectTypeOf(state.tracePromise).toEqualTypeOf<Promise<LangfuseTrace | null> | null>()
    expectTypeOf(state.spanPromises).toEqualTypeOf<Map<string, Promise<LangfuseSpan | null>>>()
  })
})
