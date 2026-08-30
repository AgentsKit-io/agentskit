import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { contentHashForArtifactV1 } from '@agentskit/doc-bridge'
import { createEcosystemDocBridgeCorpusScannerAgent } from '../agents/ecosystem-doc-bridge-corpus-scanner/agent.ts'

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const cli = '/Users/rebecabraun/workspace/EmersonBraun/doc-bridge/bin/ak-docs.js'
const config = 'doc-bridge.config.json'

function latestWorkflowValue(stage) {
  const manifest = JSON.parse(readFileSync(join(root, '.doc-bridge/workflow/manifest.json'), 'utf8'))
  const step = manifest.steps.find((candidate) => candidate.name === stage)
  const reference = step?.artifactRefs?.find((candidate) => candidate.startsWith('artifacts/'))
  assert.ok(reference, `missing ${stage} artifact`)
  return JSON.parse(readFileSync(join(root, '.doc-bridge/workflow', reference), 'utf8')).value
}

function runProposal() {
  return JSON.parse(execFileSync(process.execPath, [cli, 'suggest', '--json', '--config', config], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })).proposal
}

test('Registry agent replay is deterministic and evidence-bound', () => {
  const first = runProposal()
  const second = runProposal()
  const snapshot = latestWorkflowValue('normalize')
  const report = latestWorkflowValue('reconcile')
  const reportDiagnosticIds = new Set(report.diagnostics.map((diagnostic) => diagnostic.id))
  const pathCount = Number(first.rationale.match(/classified (\d+) explicit/)?.[1] ?? 0)

  assert.equal(first.origin.kind, 'registry-agent')
  assert.equal(first.origin.id, 'ecosystem-doc-bridge-corpus-scanner')
  assert.equal(first.origin.version, '1.0.0')
  assert.equal(first.origin.provider, 'agentskit-registry')
  assert.ok(pathCount > 0, 'the Registry agent must classify the current corpus')
  assert.equal(first.proposalId, second.proposalId)
  assert.equal(first.contentHash, second.contentHash)
  assert.equal(first.contentHash, contentHashForArtifactV1(first))
  assert.equal(first.baseSnapshotHash, snapshot.contentHash)
  assert.equal(first.baseReportHash, report.contentHash)
  assert.ok(first.evidence.length > 0)
  assert.ok(first.relatedDiagnosticIds.length > 0)
  assert.ok(first.relatedDiagnosticIds.every((id) => reportDiagnosticIds.has(id)))
})

test('Registry agent safety net drops paths absent from the corpus input', async () => {
  const adapter = {
    createSource(request) {
      const tool = request.context?.tools?.[0]
      return {
        abort() {},
        async *stream() {
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'safety-net',
              name: tool.name,
              args: JSON.stringify({
                summary: 'model output',
                scannedPaths: [
                  { path: 'docs/real.md', docType: 'human-doc', staleness: 'unknown' },
                  { path: 'docs/invented.md', docType: 'human-doc', staleness: 'unknown' },
                ],
                gaps: [],
                openQuestions: [],
              }),
            },
          }
          yield { type: 'done' }
        },
      }
    },
  }
  const result = await createEcosystemDocBridgeCorpusScannerAgent({ adapter }).run('docs/real.md')
  assert.deepEqual(result.scannedPaths.map(({ path }) => path), ['docs/real.md'])
  assert.deepEqual(result.gaps, ['dropped 1 path(s) not present in input'])
  assert.equal(result.requiresReview, true)
})
