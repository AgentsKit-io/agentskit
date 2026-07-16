#!/usr/bin/env node
/**
 * CI gate: product chats stay on consolidated AgentsKit Chat 0.3.
 *
 * Fails when Docs or Registry product widgets reintroduce legacy standalone
 * packages (`@agentskit/chat-protocol`, `@agentskit/chat-react`) or drift from
 * the exact `@agentskit/chat@0.4.0` pin / supported subpaths.
 *
 * Low-level binding examples are classified and excluded — they are educational
 * demos of `@agentskit/react` (etc.), not product-chat framework hosts.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditProductChatAdoption } from './lib/product-chat-adoption.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const result = auditProductChatAdoption(root)

if (!result.ok) {
  process.stderr.write(
    `Product-chat adoption gate failed (${result.violations.length} issue(s)).\n` +
      `Product surfaces must pin @agentskit/chat@${result.exactChatVersion} and use only:\n` +
      `  @agentskit/chat, @agentskit/chat/protocol, @agentskit/chat/react\n` +
      `Legacy packages @agentskit/chat-protocol and @agentskit/chat-react are forbidden.\n\n`,
  )
  for (const violation of result.violations) {
    process.stderr.write(`  - ${violation}\n`)
  }
  process.stderr.write('\n')
  process.exit(1)
}

process.stdout.write(
  `product-chat adoption ok: surfaces=[${result.surfaces.join(', ')}] ` +
    `chat@${result.exactChatVersion} files=${result.auditedFiles.length} ` +
    `(low-level binding examples excluded)\n`,
)
