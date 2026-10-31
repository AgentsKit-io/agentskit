import { verifyTelegram } from '../webhook-verify'
import type { Channel, ChannelAttachment, ChannelOptionsBase } from './types'
import { arr, parseBody, postJson, rec, str, withSecret } from './shared'

/** Credentials and transport for {@link telegramChannel}. */
export interface TelegramChannelOptions extends ChannelOptionsBase {
  botToken: string
  /** Secret token registered with `setWebhook` (`x-telegram-bot-api-secret-token`). */
  secretToken: string
}

/** Telegram Bot API channel. */
export function telegramChannel(options: TelegramChannelOptions): Channel {
  const fetchImpl = options.fetch ?? globalThis.fetch
  return {
    name: 'telegram',
    verify: (input) => withSecret(options.secretToken, () => verifyTelegram({ ...input, secret: options.secretToken })),
    receive: (rawBody) => {
      const update = parseBody(rawBody)
      const m = rec(update?.message) ?? rec(update?.edited_message)
      if (!m) return []
      const chat = rec(m.chat)
      const from = rec(m.from)
      const attachments: ChannelAttachment[] = []
      const photos = arr(m.photo)
      const largest = photos[photos.length - 1]
      if (largest) attachments.push({ id: str(largest.file_id), contentType: 'image/jpeg', sizeBytes: Number(largest.file_size) || undefined })
      const doc = rec(m.document)
      if (doc) {
        attachments.push({ id: str(doc.file_id), name: str(doc.file_name), contentType: str(doc.mime_type), sizeBytes: Number(doc.file_size) || undefined })
      }
      const date = Number(m.date)
      const name = [str(from?.first_name), str(from?.last_name)].filter(Boolean).join(' ')
      return [{
        channel: 'telegram',
        id: str(m.message_id) ?? str(update?.update_id) ?? '',
        from: { id: str(from?.id) ?? '', name: name || str(from?.username), isBot: from?.is_bot === true },
        conversationId: str(chat?.id) ?? '',
        threadId: str(m.message_thread_id),
        text: str(m.text) ?? str(m.caption) ?? '',
        attachments,
        receivedAt: Number.isFinite(date) && date > 0 ? new Date(date * 1000).toISOString() : undefined,
        raw: m,
      }]
    },
    send: async (message) => {
      await postJson('telegram', fetchImpl, `https://api.telegram.org/bot${options.botToken}/sendMessage`, {}, {
        chat_id: message.conversationId,
        text: message.text,
        message_thread_id: message.threadId ? Number(message.threadId) : undefined,
      })
    },
  }
}
