import { buildMessage } from '@agentskit/core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { InputBar, Message, ToolCallView } from '../dist/index.js'

describe('@agentskit/svelte SSR / a11y', () => {
  it('renders the packaged component entry on the server', () => {
    const result = render(Message, {
      props: { message: buildMessage({ role: 'assistant', content: 'SSR ready' }) },
    })
    expect(result.body).toContain('SSR ready')
    expect(result.body).toContain('data-ak-message')
  })

  it('server-renders InputBar without redundant textbox role and ToolCallView aria-expanded', () => {
    const chat = {
      messages: [],
      status: 'idle',
      input: 'draft',
      error: null,
      send: async () => {},
      setInput: () => {},
      stop: () => {},
      retry: async () => {},
      clear: async () => {},
      approve: async () => {},
      deny: async () => {},
      edit: async () => {},
      regenerate: async () => {},
    }
    const input = render(InputBar, { props: { chat } })
    expect(input.body).toContain('data-ak-input')
    expect(input.body).not.toMatch(/role=["']textbox["']/)

    const tool = render(ToolCallView, {
      props: {
        toolCall: {
          id: 't1',
          name: 'search',
          args: { q: 'x' },
          status: 'complete',
          result: 'ok',
        },
      },
    })
    expect(tool.body).toContain('aria-expanded="false"')
  })

  it('compiles InputBar without accessibility warnings', async () => {
    const source = await readFile(join(process.cwd(), 'src/components/InputBar.svelte'), 'utf8')
    const result = compile(source, { filename: 'InputBar.svelte', generate: 'client' })
    expect(result.warnings.filter(w => w.code.startsWith('a11y_'))).toEqual([])
  })
})
