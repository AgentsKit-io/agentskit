/** A line-based guardrail that can be passed to `@agentskit/cross-platform`. */
export interface NetRule {
  id: string
  pattern: RegExp
  message: string
  fix: string
}

/**
 * Static checks for duplicated HTTP, timeout, SSE and address-handling code.
 * Pass the array as `rules` to `scanText` / `scanRepository`, then ratchet
 * the counts with `compareToBaseline`. The scanner still honours a
 * `cross-platform-ignore: <reason>` directive on the offending line or the
 * line above.
 */
export const NET_RULES: readonly NetRule[] = [
  {
    id: 'net-retry-after',
    pattern: /^(?!.*\bparseRetryAfter\s*\().*\bheaders\.get\(\s*['"]retry-after['"]\s*\)/i,
    message: 'Retry-After parsing belongs to @agentskit/net',
    fix: 'parseRetryAfter() / fetchWithRetry() from @agentskit/net',
  },
  {
    id: 'net-sse-data-prefix',
    pattern: /\.startsWith\(\s*['"]data:|\/\^data:\s?\//,
    message: 'Line-based SSE parsing mishandles valid events and chunk boundaries',
    fix: 'parseSSE() from @agentskit/net',
  },
  {
    id: 'net-sleep-promise',
    pattern: /new\s+Promise.*setTimeout\s*\(/,
    message: 'Avoid hand-rolled timer delays; use the retry helper for retry backoff',
    fix: 'retry() from @agentskit/net for retry backoff',
  },
  {
    id: 'net-promise-race-timeout',
    pattern: /Promise\.race.*setTimeout|setTimeout.*Promise\.race/,
    message: 'Promise.race abandons work instead of cancelling it on timeout',
    fix: 'withTimeout(work(signal), ms) when work accepts a signal; otherwise pass timeoutSignal(ms) from @agentskit/net to cancellable work',
  },
  {
    id: 'net-private-ip-regex',
    pattern: /\/(?:\^)?(?:10\\\.|192\\\.168|172\\\.(?:1[6-9]|2\d|3[01])|169\\\.254)/,
    message: 'Private-address regexes miss IPv6 and mapped addresses',
    fix: 'isPublicAddress() / assertPublicUrl() from @agentskit/net',
  },
  {
    id: 'net-unbounded-body',
    pattern: /await\s+(?:res|response)\.(?:text|json|arrayBuffer)\s*\(\s*\)/,
    message: 'External response bodies need a byte limit',
    fix: 'readText() / readJson() from @agentskit/net with maxBytes',
  },
]
