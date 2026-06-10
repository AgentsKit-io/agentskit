import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface TelegramRuntimeConfig {
  token: string
}

function botPath(config: unknown, method: string): string {
  const token = (config as TelegramRuntimeConfig).token
  return `/bot${token}/${method}`
}

interface TelegramResult<T> {
  ok: boolean
  result?: T
  description?: string
}

export const telegramSendMessage = defineAction({
  name: 'telegram_send_message',
  description: 'Send a text message to a Telegram chat via a bot.',
  sideEffect: 'external',
  sendCapability: 'sendMessage',
  schema: {
    type: 'object',
    properties: {
      chat_id: { type: 'string', description: 'Target chat id or @channelusername.' },
      text: { type: 'string' },
      parse_mode: { type: 'string', enum: ['MarkdownV2', 'HTML'] },
    },
    required: ['chat_id', 'text'],
  },
  async execute(args, { http, config }) {
    const result = await http<TelegramResult<{ message_id: number }>>({
      method: 'POST',
      path: botPath(config, 'sendMessage'),
      body: { chat_id: args.chat_id, text: args.text, parse_mode: args.parse_mode },
    })
    if (!result.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `telegram: ${result.description ?? 'sendMessage failed'}` })
    }
    return { messageId: result.result?.message_id }
  },
})

export const telegramSendPhoto = defineAction({
  name: 'telegram_send_photo',
  description: 'Send a photo (by URL or file_id) to a Telegram chat via a bot.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      chat_id: { type: 'string' },
      photo: { type: 'string', description: 'Image URL or Telegram file_id.' },
      caption: { type: 'string' },
    },
    required: ['chat_id', 'photo'],
  },
  async execute(args, { http, config }) {
    const result = await http<TelegramResult<{ message_id: number }>>({
      method: 'POST',
      path: botPath(config, 'sendPhoto'),
      body: { chat_id: args.chat_id, photo: args.photo, caption: args.caption },
    })
    if (!result.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `telegram: ${result.description ?? 'sendPhoto failed'}` })
    }
    return { messageId: result.result?.message_id }
  },
})

export const telegramActions = [telegramSendMessage, telegramSendPhoto]
