import { buildMessage } from '@agentskit/core'
import { render } from 'svelte/server'
import { expect, it } from 'vitest'
import { Message } from '../dist/index.js'

it('renders the packaged component entry on the server', () => {
  const result = render(Message, { props: { message: buildMessage({ role: 'assistant', content: 'SSR ready' }) } })
  expect(result.body).toContain('SSR ready')
  expect(result.body).toContain('data-ak-message')
})
