'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'
import { MdRenderer } from './_shared/md-renderer'

const TURNS = [
  {
    text: `## Styling options in AgentsKit

You can pick from three styling modes:

1. **Headless** — use the hooks and style with your design system
2. **Default theme** — \`import '@agentskit/react/theme'\` for the tokenised CSS
3. **Custom CSS** — target \`data-ak-*\` attributes directly

| Mode | Lines | Output |
| --- | --- | --- |
| headless | ~20 | fully custom |
| theme | 1 | branded defaults |
| data-ak | a few | anywhere in between |

> The \`Markdown\` component ships with support for GFM tables, task lists, and inline code.`,
  },
  {
    text: `### Inline formatting

- **Bold** and *italic* text
- \`inline code\` with proper spacing
- [Links](https://agentskit.io) that keep their styling
- ~~strikethrough~~ when you need it

\`\`\`ts
const muted = 'var(--color-fd-muted-foreground)'
\`\`\``,
  },
]

export function MarkdownChat() {
  const adapter = useMemo(() => createMockAdapter(TURNS, 130), [])
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant(
        'Ask me for a styled response — I stream full GitHub-flavoured Markdown.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-3 p-4">
        {chat.messages.map((m) => (
          <div key={m.id} data-ak-message data-ak-role={m.role} className="rounded-lg bg-ak-midnight/40 p-3">
            <MdRenderer content={m.content} />
          </div>
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
