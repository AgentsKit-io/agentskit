import type { AdapterFactory } from '@agentskit/core'
import { createRuntime } from '@agentskit/runtime'

const localAdapter: AdapterFactory = {
  createSource(request) {
    const task = request.messages.at(-1)?.content ?? 'your task'

    return {
      async *stream() {
        yield {
          type: 'text' as const,
          content: `Agent ready. I received: ${task}`,
        }
        yield { type: 'done' as const }
      },
      abort() {},
    }
  },
}

async function main() {
  const runtime = createRuntime({ adapter: localAdapter })
  const result = await runtime.run('Plan my first production agent')
  console.log(result.content)
}

void main()
