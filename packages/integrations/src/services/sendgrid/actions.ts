import { defineAction } from '../../contract'

export const sendgridSendEmail = defineAction({
  name: 'sendgrid_send_email',
  description: 'Send an email via SendGrid (v3 Mail Send API).',
  sideEffect: 'external',
  sendCapability: 'mail.send',
  schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address.' },
      from: { type: 'string', description: 'Verified sender email address.' },
      subject: { type: 'string' },
      text: { type: 'string', description: 'Plain-text body.' },
      html: { type: 'string', description: 'HTML body (optional; overrides text rendering).' },
    },
    required: ['to', 'from', 'subject'],
  },
  async execute(args, { http }) {
    const content: Array<{ type: string; value: string }> = []
    if (args.text) content.push({ type: 'text/plain', value: String(args.text) })
    if (args.html) content.push({ type: 'text/html', value: String(args.html) })
    if (content.length === 0) content.push({ type: 'text/plain', value: '' })
    await http({
      method: 'POST',
      path: '/mail/send',
      body: {
        personalizations: [{ to: [{ email: args.to }] }],
        from: { email: args.from },
        subject: args.subject,
        content,
      },
    })
    // SendGrid returns 202 with an empty body on success.
    return { ok: true }
  },
})

export const sendgridActions = [sendgridSendEmail]
