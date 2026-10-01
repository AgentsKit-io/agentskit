/**
 * One line-oriented HTTP guardrail rule.
 * @since 0.2.0
 */
export interface NetRule {
  /** Identifier used in findings and `<id>-ignore` suppressions. */
  id: string
  /** Regular expression tested against each source line. */
  pattern: RegExp
  /** Explanation shown for a matching line. */
  message: string
  /** Suggested replacement using APIs exported by `@agentskit/net`. */
  fix: string
}

/**
 * Static rules that flag duplicated HTTP retry, SSE, timeout, address and response-body handling outside `@agentskit/net`.
 * Pass them to `scanText` or `scanRepository`, then ratchet counts with `compareToBaseline`.
 * `<id>-ignore: <reason>` suppresses one rule (for example, `net-retry-after-ignore: <reason>`); `cross-platform-ignore: <reason>` suppresses all rules.
 * @since 0.2.0
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
    fix: 'Pass timeoutSignal(ms) from @agentskit/net to cancellable work instead of abandoning it with Promise.race',
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
