import { defineTrigger, type NormalizedEvent } from '../../contract'
import { verifyHmacSha256Body } from '../../webhook-verify'

export const githubEvent = defineTrigger({
  name: 'github.event',
  source: 'github',
  verify: (input) => verifyHmacSha256Body(input, 'x-hub-signature-256', 'sha256='),
  normalize: (raw): NormalizedEvent => {
    const json = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>
    const action = typeof json.action === 'string' ? json.action : undefined
    const kind = json.pull_request ? 'pull_request' : json.issue ? 'issues' : json.release ? 'release' : json.ref ? 'push' : 'unknown'
    const repo = (json.repository as { full_name?: string } | undefined)?.full_name
    return { kind, payload: { action, repo, body: json }, raw }
  },
})

export const githubTriggers = [githubEvent]
