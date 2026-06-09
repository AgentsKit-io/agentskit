import { defineAction } from '../../contract'

export const discordPostMessage = defineAction({
  name: 'discord_post_message',
  description: 'Post a message to a Discord channel.',
  sideEffect: 'external',
  sendCapability: 'channel.createMessage',
  schema: {
    type: 'object',
    properties: {
      channel_id: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['channel_id', 'content'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; channel_id: string }>({
      method: 'POST',
      path: `/channels/${args.channel_id}/messages`,
      body: { content: args.content },
    })
    return { id: result.id, channel_id: result.channel_id }
  },
})

export const discordActions = [discordPostMessage]
