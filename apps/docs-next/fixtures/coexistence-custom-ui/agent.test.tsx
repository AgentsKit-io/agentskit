// @vitest-environment happy-dom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { mountCustomUi } from './agent'
import { ReactUi } from './ReactUi'

const history = (messages: Array<{ role: string; content: string }>) =>
  messages.map(message => [message.role, message.content])

describe('coexistence-custom-ui fixture', () => {
  it('keeps the same history in @agentskit/react and in a core-only UI', async () => {
    // AgentsKit UI
    let reactChat: { messages: Array<{ role: string; content: string }>; send: (text: string) => Promise<void> } | undefined
    const view = render(<ReactUi onReady={chat => { reactChat = chat }} />)
    await act(async () => {
      await reactChat!.send('hello')
      await reactChat!.send('again')
    })

    // Own UI, only createChatController from core
    const root = document.createElement('div')
    document.body.append(root)
    const own = mountCustomUi(root)
    await own.send('hello')
    await own.send('again')

    const expected = [
      ['user', 'hello'],
      ['assistant', 'You said: hello'],
      ['user', 'again'],
      ['assistant', 'You said: again'],
    ]
    expect(history(reactChat!.messages)).toEqual(expected)
    expect(history(own.getState().messages)).toEqual(expected)

    // What each UI actually put on screen matches too.
    const reactTexts = [...view.container.querySelectorAll('[data-ak-content]')].map(node => node.textContent)
    const ownTexts = [...root.querySelectorAll('li')].map(node => node.textContent)
    expect(reactTexts).toEqual(expected.map(row => row[1]))
    expect(ownTexts).toEqual(reactTexts)
    cleanup()
  })
})
