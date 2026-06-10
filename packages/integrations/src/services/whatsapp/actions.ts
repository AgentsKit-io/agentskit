import { defineAction } from '../../contract'

function phoneId(config: unknown): string {
  return (config as { phoneNumberId: string }).phoneNumberId
}

export const whatsappSendText = defineAction({
  name: 'whatsapp_send_text',
  description: 'Send a WhatsApp text message via the Cloud API.',
  sideEffect: 'external',
  sendCapability: 'messages.send',
  schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient phone in international format (digits only).' },
      text: { type: 'string' },
    },
    required: ['to', 'text'],
  },
  async execute(args, { http, config }) {
    const result = await http<{ messages?: Array<{ id: string }> }>({
      method: 'POST',
      path: `/${phoneId(config)}/messages`,
      body: { messaging_product: 'whatsapp', to: args.to, type: 'text', text: { body: args.text } },
    })
    return { messageId: result.messages?.[0]?.id }
  },
})

export const whatsappActions = [whatsappSendText]
