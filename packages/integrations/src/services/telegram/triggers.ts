import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyTelegram } from '../../webhook-verify'

interface TelegramMessage {
  message_id?: number
  message_thread_id?: number
  chat?: { id?: number | string }
  from?: { id?: number | string }
  text?: string
}

interface TelegramUpdate {
  update_id?: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  callback_query?: { id?: string; data?: string; from?: { id?: number | string }; message?: TelegramMessage }
}

function update(raw: unknown): TelegramUpdate | undefined {
  const parsed = parseJsonRecord(raw)
  return parsed.ok ? parsed.value as TelegramUpdate : undefined
}

function messageOf(value: TelegramUpdate): TelegramMessage | undefined {
  return value.message ?? value.edited_message ?? value.callback_query?.message
}

export const telegramUpdate = defineTrigger({
  name: 'telegram.update',
  source: 'telegram',
  verify: verifyTelegram,
  normalize: (raw): NormalizedEvent => {
    const json = update(raw)
    if (!json) return invalidJsonEvent(raw)
    const message = messageOf(json)
    let kind = 'unknown'
    if (json.callback_query) kind = 'callback_query'
    else if (json.edited_message) kind = 'edited_message'
    else if (json.message) kind = 'message'
    return {
      kind,
      payload: {
        updateId: json.update_id,
        messageId: message?.message_id,
        chatId: message?.chat?.id,
        userId: message?.from?.id ?? json.callback_query?.from?.id,
        text: message?.text,
        callbackData: json.callback_query?.data,
      },
      raw,
    }
  },
  externalThreadRef: (raw) => {
    const json = update(raw)
    if (!json) return undefined
    const message = messageOf(json)
    const chatId = message?.chat?.id
    if (chatId === undefined) return undefined
    const threadId = message?.message_thread_id ?? 'root'
    return { kind: 'telegram.thread', id: `${chatId}:${threadId}`, parentId: String(chatId) }
  },
})

export const telegramTriggers = [telegramUpdate]
