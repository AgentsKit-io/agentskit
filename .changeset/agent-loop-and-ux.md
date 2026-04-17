---
"@agentskit/core": minor
"@agentskit/adapters": minor
"@agentskit/ink": minor
"@agentskit/cli": patch
---

feat(core): bounded agent loop that feeds tool results back to the model

- `createChatController` now iterates after tool calls complete so the LLM
  produces a final answer using the results. Configurable via
  `ChatConfig.maxToolIterations` (default 5). Retrieval only runs on the
  first turn of each user message.
- `Message.toolCallId` added for `role: 'tool'` messages.
- `buildMessage` forwards `toolCallId`.

feat(adapters): serialize tool calls for OpenAI-compatible providers

`toProviderMessages` now emits OpenAI-spec `tool_calls` on assistant
messages and `tool_call_id` on tool-role messages, so follow-up turns
carry full context to the model.

feat(ink): richer terminal chat UX

- Animated braille spinner in `ThinkingIndicator`
- Role icons + color-coded badges in `Message`; tool-role rendered compact
- `ToolCallView` — status-colored border, live spinner, previews, labels
- `InputBar` — cyan prompt glyph, blinking cursor, context-aware hint
- New `StatusHeader` with provider/model/tools/mode summary
- New `MarkdownText` component (uses `marked` + `marked-terminal`),
  renders tables, code fences, lists, emphasis, links
- `Message` auto-renders markdown for assistant content (opt-out via
  `markdown={false}`)

feat(cli): agent-loop step badges + polished chat layout

Groups messages into turns, renders `↻ step N/M` badge when the agent
loop ran multiple tool-feedback iterations. Uses the new `StatusHeader`
and passes `expanded` to `ToolCallView` so tool results are visible.
