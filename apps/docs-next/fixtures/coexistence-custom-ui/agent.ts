import { createChatController, type AdapterFactory, type ChatConfig } from '@agentskit/core'

/** One agent definition, shared by every UI: a deterministic echo model. */
export const agentAdapter: AdapterFactory = {
  createSource(request) {
    const task = request.messages.findLast(message => message.role === 'user')?.content ?? ''
    return {
      async *stream() {
        yield { type: 'text' as const, content: 'You said: ' }
        yield { type: 'text' as const, content: task }
        yield { type: 'done' as const }
      },
      abort() {},
    }
  },
}

export const agentConfig: ChatConfig = { adapter: agentAdapter }

/**
 * A minimal non-AgentsKit UI: plain DOM, driven only by the core controller.
 * It renders `<li data-role>` rows and returns the controller for the host.
 */
export function mountCustomUi(root: HTMLElement, config: ChatConfig = agentConfig) {
  const chat = createChatController(config)
  const list = root.ownerDocument.createElement('ul')
  root.append(list)
  const render = () => {
    list.replaceChildren(
      ...chat.getState().messages.map(message => {
        const item = root.ownerDocument.createElement('li')
        item.dataset.role = message.role
        item.textContent = message.content
        return item
      }),
    )
  }
  chat.subscribe(render)
  render()
  return chat
}
