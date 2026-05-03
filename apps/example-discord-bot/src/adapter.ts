import { webcrypto } from 'node:crypto'
import type { ChatSurfaceAdapter, ChatSurfaceEvent } from '@agentskit/runtime'

/**
 * Reference Discord adapter for the Interactions HTTP endpoint flow.
 * Driver-light: uses Discord's REST API via `fetch` for replies,
 * verifies inbound interactions with Discord's Ed25519 signature.
 *
 * For richer setups (presence, voice, gateway events), wrap discord.js
 * — this adapter covers the slash-command + message-component path.
 */

export interface DiscordAdapterOptions {
  /** Bot token from the Discord developer portal. */
  botToken: string
  /** Application's public key (hex) used to verify signed interactions. */
  publicKey: string
  /** Override fetch (for tests). */
  fetch?: typeof fetch
}

interface DiscordInteraction {
  /** 1=PING, 2=APPLICATION_COMMAND, 3=MESSAGE_COMPONENT, 5=MODAL_SUBMIT */
  type: number
  id: string
  channel_id?: string
  guild_id?: string
  user?: { id: string; username?: string; bot?: boolean }
  member?: { user?: { id: string; username?: string; bot?: boolean } }
  data?: { name?: string; options?: Array<{ name: string; value: unknown }> }
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

async function verifyEd25519(publicKeyHex: string, signatureHex: string, message: string): Promise<boolean> {
  try {
    const subtle = (webcrypto as Crypto).subtle
    const keyBytes = hexToBytes(publicKeyHex)
    const sigBytes = hexToBytes(signatureHex)
    const msgBytes = new TextEncoder().encode(message)
    const key = await subtle.importKey(
      'raw',
      keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    return await subtle.verify(
      'Ed25519',
      key,
      sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer,
      msgBytes.buffer.slice(msgBytes.byteOffset, msgBytes.byteOffset + msgBytes.byteLength) as ArrayBuffer,
    )
  } catch {
    return false
  }
}

export function discordAdapter(options: DiscordAdapterOptions): ChatSurfaceAdapter {
  const fetchImpl = options.fetch ?? fetch

  return {
    surface: 'discord',

    verify: async req => {
      const headers = req.headers ?? {}
      const sig = headers['x-signature-ed25519']
      const ts = headers['x-signature-timestamp']
      if (typeof sig !== 'string' || typeof ts !== 'string') return false
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? '')
      return verifyEd25519(options.publicKey, sig, ts + body)
    },

    parse: req => {
      const interaction = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as DiscordInteraction
      // PING is for the registration handshake — let the integrating
      // server PONG before the trigger sees it.
      if (interaction.type === 1) return null

      const userObj = interaction.user ?? interaction.member?.user
      const meta = {
        surface: 'discord' as const,
        eventId: interaction.id,
        channel: { id: interaction.channel_id ?? '' },
        user: { id: userObj?.id ?? '', name: userObj?.username, isBot: Boolean(userObj?.bot) },
      }

      // Slash command (APPLICATION_COMMAND) → mention with command name.
      if (interaction.type === 2) {
        const command = interaction.data?.name
        const text =
          interaction.data?.options
            ?.map(o => `${o.name}=${String(o.value)}`)
            .join(' ') ?? ''
        return { ...meta, type: 'mention', text, command }
      }
      // Component interaction (button / select) — surface as mention with
      // the custom_id payload as text. Refines later if templates need
      // a separate ChatSurfaceEvent variant for components.
      if (interaction.type === 3) {
        return { ...meta, type: 'mention', text: JSON.stringify(interaction.data ?? {}) }
      }
      return null
    },

    reply: async (event, text) => {
      const channel = event.channel.id
      if (!channel) return
      await fetchImpl(`https://discord.com/api/v10/channels/${channel}/messages`, {
        method: 'POST',
        headers: {
          authorization: `Bot ${options.botToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ content: text }),
      })
    },
  }
}

export type { ChatSurfaceEvent }
