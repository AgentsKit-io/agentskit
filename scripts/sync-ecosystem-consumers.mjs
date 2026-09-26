#!/usr/bin/env node
/**
 * sync-ecosystem-consumers — open or update one pull request per consumer repository so its
 * copies of the canonical `ecosystem.json` and `ecosystem-claims.json` match this repository.
 * Only those files (and a consumer's upstream digest file, when it keeps one) are written;
 * nothing is regenerated in the consumer.
 *
 *   ECOSYSTEM_SYNC_TOKEN=… node scripts/sync-ecosystem-consumers.mjs
 *   node scripts/sync-ecosystem-consumers.mjs --dry-run      # report drift, write nothing
 *
 * The token needs `contents: write` and `pull-requests: write` on every consumer repository.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CANONICAL_FILES = Object.freeze(['ecosystem.json', 'ecosystem-claims.json'])
export const SYNC_BRANCH = 'chore/sync-agentskit-ecosystem'

export const CONSUMERS = Object.freeze([
  { repo: 'AgentsKit-io/agentskit-registry', base: 'main' },
  { repo: 'AgentsKit-io/agentskit-chat', base: 'main' },
  { repo: 'AgentsKit-io/agents-playbook', base: 'main' },
  { repo: 'AgentsKit-io/doc-bridge', base: 'master', upstreamDigest: 'ecosystem-upstream.json' },
  { repo: 'AgentsKit-io/harness', base: 'main' },
  { repo: 'AgentsKit-io/code-review', base: 'main' },
])

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

/**
 * Updates a consumer's upstream digest file (Doc Bridge's `ecosystem-upstream.json`) to the
 * digests of the canonical content, preserving its other fields and trailing-newline style.
 */
export function updatedDigestFile(current, canonical) {
  const metadata = JSON.parse(current)
  const files = { ...metadata.files }
  for (const file of CANONICAL_FILES) files[file] = sha256(canonical[file])
  const next = JSON.stringify({ ...metadata, files }, null, 2)
  return current.endsWith('\n') ? `${next}\n` : next
}

/** Returns the files whose consumer copy differs from what the canonical content requires. */
export function plannedChanges(consumer, canonical, current) {
  const changes = {}
  for (const file of CANONICAL_FILES) {
    if (current[file] !== canonical[file]) changes[file] = canonical[file]
  }
  if (consumer.upstreamDigest) {
    const existing = current[consumer.upstreamDigest]
    if (typeof existing !== 'string') throw new Error(`${consumer.repo} is missing ${consumer.upstreamDigest}`)
    const next = updatedDigestFile(existing, canonical)
    if (next !== existing) changes[consumer.upstreamDigest] = next
  }
  return changes
}

function pullRequestBody(sourceSha, files) {
  return [
    'Automated sync of the canonical AgentsKit ecosystem files.',
    '',
    `Source: AgentsKit-io/agentskit@${sourceSha}`,
    '',
    'Files:',
    ...files.map((file) => `- \`${file}\``),
    '',
    'Only these files are copied verbatim (plus the upstream digest, where kept). Nothing else is',
    'regenerated; run the repository\'s own sync or check scripts if it derives further outputs.',
    'Opened by `.github/workflows/ecosystem-sync.yml` in AgentsKit-io/agentskit.',
  ].join('\n')
}

function createClient(token) {
  const request = async (method, path, body) => {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'agentskit-ecosystem-sync',
        'x-github-api-version': '2022-11-28',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${await response.text()}`)
    return response.status === 204 ? {} : response.json()
  }
  return { request }
}

async function readRemoteFile(client, repo, ref, path) {
  const payload = await client.request('GET', `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`)
  if (!payload) return undefined
  if (payload.encoding !== 'base64') throw new Error(`${repo}:${path} is not a base64 file payload`)
  return Buffer.from(payload.content.replace(/\s+/g, ''), 'base64').toString('utf8')
}

async function pushSyncBranch(client, consumer, changes, sourceSha) {
  const { repo, base } = consumer
  const baseRef = await client.request('GET', `/repos/${repo}/git/ref/heads/${base}`)
  const baseSha = baseRef.object.sha
  const baseCommit = await client.request('GET', `/repos/${repo}/git/commits/${baseSha}`)
  const tree = await client.request('POST', `/repos/${repo}/git/trees`, {
    base_tree: baseCommit.tree.sha,
    tree: Object.entries(changes).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
  })
  const commit = await client.request('POST', `/repos/${repo}/git/commits`, {
    message: `chore: sync AgentsKit ecosystem files\n\nSource: AgentsKit-io/agentskit@${sourceSha}`,
    tree: tree.sha,
    parents: [baseSha],
  })
  const existing = await client.request('GET', `/repos/${repo}/git/ref/heads/${SYNC_BRANCH}`)
  if (existing) {
    await client.request('PATCH', `/repos/${repo}/git/refs/heads/${SYNC_BRANCH}`, { sha: commit.sha, force: true })
  } else {
    await client.request('POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${SYNC_BRANCH}`, sha: commit.sha })
  }

  const owner = repo.split('/')[0]
  const open = await client.request('GET', `/repos/${repo}/pulls?state=open&base=${base}&head=${owner}:${SYNC_BRANCH}`)
  const body = pullRequestBody(sourceSha, Object.keys(changes))
  if (open && open.length > 0) {
    await client.request('PATCH', `/repos/${repo}/pulls/${open[0].number}`, { body })
    return `updated ${open[0].html_url}`
  }
  const created = await client.request('POST', `/repos/${repo}/pulls`, {
    title: 'chore: sync AgentsKit ecosystem files',
    head: SYNC_BRANCH,
    base,
    body,
  })
  return `opened ${created.html_url}`
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const dryRun = process.argv.includes('--dry-run')
  const token = process.env.ECOSYSTEM_SYNC_TOKEN || ''
  if (!dryRun && !token) {
    console.log('::notice::ECOSYSTEM_SYNC_TOKEN is not set; skipping consumer sync. Use --dry-run to report drift.')
    return
  }
  const sourceSha = process.env.GITHUB_SHA || 'local'
  const canonical = Object.fromEntries(CANONICAL_FILES.map((file) => [file, readFileSync(join(root, file), 'utf8')]))
  const client = createClient(token)
  let failures = 0

  for (const consumer of CONSUMERS) {
    try {
      const paths = [...CANONICAL_FILES, ...(consumer.upstreamDigest ? [consumer.upstreamDigest] : [])]
      const current = {}
      for (const path of paths) current[path] = await readRemoteFile(client, consumer.repo, consumer.base, path)
      const changes = plannedChanges(consumer, canonical, current)
      const files = Object.keys(changes)
      if (files.length === 0) {
        console.log(`${consumer.repo}: in sync`)
        continue
      }
      if (dryRun) {
        console.log(`${consumer.repo}: would update ${files.join(', ')}`)
        continue
      }
      console.log(`${consumer.repo}: ${await pushSyncBranch(client, consumer, changes, sourceSha)} (${files.join(', ')})`)
    } catch (error) {
      failures += 1
      console.log(`::error::${consumer.repo}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (failures > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
