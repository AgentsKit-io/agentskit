// Replay helper — feeds a sequence of events through any number of handlers
// in order. Use to run live telemetry sinks against historical events loaded
// from an audit chain or storage backend.
//
// Generic over the event type `E` so it works with any event stream
// (`AgentEvent`, `TraceSpan`, or a host application's own event union) without
// coupling the replay driver to a specific schema.

export type ReplayHandler<E> = (event: E) => void | Promise<void>

export const replayEvents = async <E>(
  events: readonly E[],
  handlers: readonly ReplayHandler<E>[],
): Promise<void> => {
  for (const ev of events) {
    for (const h of handlers) {
      await h(ev)
    }
  }
}
