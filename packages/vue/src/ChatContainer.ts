import { defineComponent, h, type PropType } from 'vue'
import type { ChatConfig } from '@agentskit/core'
import { useChat } from './useChat'

/**
 * Headless chat container. Renders messages + input using
 * `data-ak-*` attributes; style it with your own CSS.
 * @example
 * ```vue
 * <ChatContainer :config="chatConfig" />
 * ```
 */
export const ChatContainer = defineComponent({
  name: 'AkChatContainer',
  props: {
    config: {
      type: Object as PropType<ChatConfig>,
      required: true,
    },
  },
  setup(props) {
    const chat = useChat(props.config)
    return () =>
      h('div', { 'data-ak-chat': '' }, [
        h(
          'div',
          { 'data-ak-messages': '' },
          chat.messages.map(m =>
            h(
              'div',
              { key: m.id, 'data-ak-message': '', 'data-ak-role': m.role },
              m.content,
            ),
          ),
        ),
        h(
          'form',
          {
            'data-ak-form': '',
            onSubmit: (e: Event) => {
              e.preventDefault()
              chat.send(chat.input)
            },
          },
          [
            h('input', {
              'data-ak-input': '',
              value: chat.input,
              onInput: (e: Event) => chat.setInput((e.target as HTMLInputElement).value),
              placeholder: 'Type a message...',
            }),
            h(
              'button',
              {
                'data-ak-submit': '',
                type: 'submit',
                disabled: chat.status === 'streaming',
              },
              'Send',
            ),
          ],
        ),
      ])
  },
})
