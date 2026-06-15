import { defineComponent, h, ref, type PropType } from 'vue'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'

/**
 * Headless chat primitives mirroring `@agentskit/react`'s component set.
 * Every component renders `data-ak-*` attributes only — bring your own CSS.
 * Compose them yourself, or use the batteries-included `<ChatContainer>`.
 */

export const Message = defineComponent({
  name: 'AkMessage',
  props: { message: { type: Object as PropType<MessageType>, required: true } },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          'data-ak-message': '',
          'data-ak-role': props.message.role,
          'data-ak-status': props.message.status,
        },
        [
          slots.avatar ? h('div', { 'data-ak-avatar': '' }, slots.avatar()) : null,
          h('div', { 'data-ak-content': '' }, props.message.content),
          slots.actions ? h('div', { 'data-ak-actions': '' }, slots.actions()) : null,
        ],
      )
  },
})

export const InputBar = defineComponent({
  name: 'AkInputBar',
  props: {
    chat: { type: Object as PropType<ChatReturn>, required: true },
    placeholder: { type: String, default: 'Type a message...' },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    const submit = (): void => {
      if (props.chat.input.trim()) props.chat.send(props.chat.input)
    }
    return () =>
      h(
        'form',
        {
          'data-ak-input-bar': '',
          onSubmit: (e: Event) => {
            e.preventDefault()
            submit()
          },
        },
        [
          h('textarea', {
            role: 'textbox',
            'data-ak-input': '',
            rows: 1,
            value: props.chat.input,
            placeholder: props.placeholder,
            disabled: props.disabled,
            onInput: (e: Event) => props.chat.setInput((e.target as HTMLTextAreaElement).value),
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            },
          }),
          h(
            'button',
            { 'data-ak-send': '', type: 'submit', disabled: props.disabled || !props.chat.input.trim() },
            'Send',
          ),
        ],
      )
  },
})

export const Markdown = defineComponent({
  name: 'AkMarkdown',
  props: {
    content: { type: String, required: true },
    streaming: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-ak-markdown': '', 'data-ak-streaming': props.streaming ? 'true' : undefined },
        props.content,
      )
  },
})

export const CodeBlock = defineComponent({
  name: 'AkCodeBlock',
  props: {
    code: { type: String, required: true },
    language: { type: String, default: undefined },
    copyable: { type: Boolean, default: false },
  },
  setup(props) {
    const copy = (): void => {
      void globalThis.navigator?.clipboard?.writeText(props.code)
    }
    return () =>
      h('div', { 'data-ak-code-block': '', 'data-ak-language': props.language }, [
        h('pre', {}, h('code', {}, props.code)),
        props.copyable ? h('button', { 'data-ak-copy': '', type: 'button', onClick: copy }, 'Copy') : null,
      ])
  },
})

export const ToolCallView = defineComponent({
  name: 'AkToolCallView',
  props: { toolCall: { type: Object as PropType<ToolCall>, required: true } },
  setup(props) {
    const expanded = ref(false)
    return () =>
      h('div', { 'data-ak-tool-call': '', 'data-ak-tool-status': props.toolCall.status }, [
        h(
          'button',
          {
            'data-ak-tool-toggle': '',
            type: 'button',
            onClick: () => {
              expanded.value = !expanded.value
            },
          },
          props.toolCall.name,
        ),
        expanded.value
          ? h('div', { 'data-ak-tool-details': '' }, [
              h('pre', { 'data-ak-tool-args': '' }, JSON.stringify(props.toolCall.args, null, 2)),
              props.toolCall.result ? h('div', { 'data-ak-tool-result': '' }, props.toolCall.result) : null,
            ])
          : null,
      ])
  },
})

export const ThinkingIndicator = defineComponent({
  name: 'AkThinkingIndicator',
  props: {
    visible: { type: Boolean, required: true },
    label: { type: String, default: 'Thinking...' },
  },
  setup(props) {
    return () =>
      props.visible
        ? h('div', { 'data-ak-thinking': '' }, [
            h('span', { 'data-ak-thinking-dots': '' }, [
              h('span', {}, '•'),
              h('span', {}, '•'),
              h('span', {}, '•'),
            ]),
            h('span', { 'data-ak-thinking-label': '' }, props.label),
          ])
        : null
  },
})

export const ToolConfirmation = defineComponent({
  name: 'AkToolConfirmation',
  props: {
    toolCall: { type: Object as PropType<ToolCall>, required: true },
    onApprove: { type: Function as PropType<(toolCallId: string) => void>, required: true },
    onDeny: { type: Function as PropType<(toolCallId: string, reason?: string) => void>, required: true },
  },
  setup(props) {
    return () =>
      props.toolCall.status !== 'requires_confirmation'
        ? null
        : h('div', { 'data-ak-tool-confirmation': '', 'data-ak-tool-name': props.toolCall.name }, [
            h('div', { 'data-ak-tool-confirmation-header': '' }, [
              h('span', { 'data-ak-tool-confirmation-name': '' }, props.toolCall.name),
              h('span', { 'data-ak-tool-confirmation-status': '' }, 'requires confirmation'),
            ]),
            h('div', { 'data-ak-tool-confirmation-args': '' }, JSON.stringify(props.toolCall.args, null, 2)),
            h('div', { 'data-ak-tool-confirmation-actions': '' }, [
              h(
                'button',
                {
                  'data-ak-tool-confirmation-approve': '',
                  type: 'button',
                  onClick: () => props.onApprove(props.toolCall.id),
                },
                'Approve',
              ),
              h(
                'button',
                {
                  'data-ak-tool-confirmation-deny': '',
                  type: 'button',
                  onClick: () => props.onDeny(props.toolCall.id),
                },
                'Deny',
              ),
            ]),
          ])
  },
})
