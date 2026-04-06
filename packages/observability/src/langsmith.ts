import type { Observer } from '@agentskit/core'
import { createTraceTracker, type TraceSpan } from './trace-tracker'

export interface LangSmithConfig {
  apiKey: string
  projectName?: string
  endpoint?: string
}

interface LangSmithClient {
  createRun(params: Record<string, unknown>): Promise<void>
  updateRun(id: string, params: Record<string, unknown>): Promise<void>
}

export function langsmith(config: LangSmithConfig): Observer {
  const { apiKey, projectName = 'agentskit', endpoint = 'https://api.smith.langchain.com' } = config
  let clientPromise: Promise<LangSmithClient> | null = null

  const getClient = (): Promise<LangSmithClient> => {
    if (clientPromise) return clientPromise
    clientPromise = (async () => {
      try {
        const mod = await import('langsmith')
        const ClientClass = mod.Client as unknown as new (c: { apiKey: string; apiUrl: string }) => LangSmithClient
        return new ClientClass({ apiKey, apiUrl: endpoint })
      } catch {
        throw new Error('Install langsmith to use the LangSmith observer: npm install langsmith')
      }
    })()
    return clientPromise
  }

  const sendRun = async (span: TraceSpan, isEnd: boolean) => {
    try {
      const client = await getClient()
      if (isEnd) {
        await client.updateRun(span.id, {
          end_time: span.endTime,
          outputs: span.attributes,
          error: span.status === 'error' ? String(span.attributes['error.message'] ?? 'unknown') : undefined,
        })
      } else {
        await client.createRun({
          id: span.id,
          name: span.name,
          run_type: span.name.startsWith('gen_ai') ? 'llm' : 'tool',
          project_name: projectName,
          parent_run_id: span.parentId ?? undefined,
          start_time: span.startTime,
          inputs: span.attributes,
        })
      }
    } catch {
      // Observability errors should not break the main loop
    }
  }

  const tracker = createTraceTracker({
    onSpanStart(span) { void sendRun(span, false) },
    onSpanEnd(span) { void sendRun(span, true) },
  })

  return {
    name: 'langsmith',
    on(event) { tracker.handle(event) },
  }
}
