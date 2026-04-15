---
'@agentskit/adapters': minor
---

New dry-run primitives — test agents without burning tokens.

```ts
import { mockAdapter, recordingAdapter, replayAdapter, inMemorySink } from '@agentskit/adapters'
```

### `mockAdapter` — deterministic adapter

Three call shapes:

```ts
// 1. Static chunks
mockAdapter({ response: [
  { type: 'text', content: 'hello' },
  { type: 'done' },
]})

// 2. Request-aware
mockAdapter({ response: req => [
  { type: 'text', content: 'echo: ' + req.messages[0].content },
  { type: 'done' },
]})

// 3. Sequenced — different output per call
mockAdapter({ response: [
  [{ type: 'text', content: 'first' },  { type: 'done' }],
  [{ type: 'text', content: 'second' }, { type: 'done' }],
]})
```

Conforms to ADR 0001 — the terminal `done` chunk is appended automatically if the response doesn't include one. Optional `delayMs` between chunks for streaming UX testing.

### `recordingAdapter` + `replayAdapter` — capture once, replay forever

```ts
import { openai, recordingAdapter, replayAdapter, inMemorySink } from '@agentskit/adapters'

// Dev: wrap the real adapter and capture every turn
const sink = inMemorySink()
const adapter = recordingAdapter(
  openai({ apiKey: KEY, model: 'gpt-4o' }),
  sink,
)
// ...run the agent...

// Test: feed the recorded fixture back
const replay = replayAdapter(sink.fixture)
```

`RecordedTurn` includes `recordedAt`, the original `request`, and every chunk yielded — JSON-serializable so you can save fixtures to disk and replay them in CI.

These are the substrate for the deterministic-replay feature tracked in #134 (Phase 2).
