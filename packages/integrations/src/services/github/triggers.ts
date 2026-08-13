import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyHmacSha256Body } from '../../webhook-verify'

export const githubEvent = defineTrigger({
  name: 'github.event',
  source: 'github',
  verify: (input) => verifyHmacSha256Body(input, 'x-hub-signature-256', 'sha256='),
  normalize: (raw): NormalizedEvent => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return invalidJsonEvent(raw)
    const json = parsed.value
    const action = typeof json.action === 'string' ? json.action : undefined
    let kind = 'unknown'
    if (json.pull_request) kind = 'pull_request'
    else if (json.issue) kind = 'issues'
    else if (json.release) kind = 'release'
    else if (json.ref) kind = 'push'
    const repo = (json.repository as { full_name?: string } | undefined)?.full_name
    return { kind, payload: { action, repo, body: json }, raw }
  },
})

export const githubTriggers = [githubEvent]
