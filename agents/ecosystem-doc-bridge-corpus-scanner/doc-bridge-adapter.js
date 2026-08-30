import { contentHashForArtifactV1 } from '@agentskit/doc-bridge'
import { createEcosystemDocBridgeCorpusScannerAgent } from './agent.ts'

const AGENT_ID = 'ecosystem-doc-bridge-corpus-scanner'
const AGENT_VERSION = '1.0.0'

const deterministicAdapter = {
  createSource(request) {
    const input = request.messages.at(-1)?.content ?? ''
    const paths = [...new Set([...input.matchAll(/(?:^|[\s"'`])([\w./-]+\.mdx?)/gi)].map((match) => match[1]))]
    const lines = input.split('\n')
    const scannedPaths = paths.map((path) => {
      const line = lines.find((candidate) => candidate.includes(path)) ?? ''
      const docType = /(^|\/)docs\/for-agents(?:\/|$)|(^|\/)AGENTS\.md$/i.test(path)
        ? 'agent-doc'
        : /(^|\/)docs(?:\/|$)/i.test(path) ? 'human-doc' : 'unknown'
      const staleness = /\b(stale|outdated|deprecated|old|202[0-4])\b/i.test(line) ? 'stale' : 'unknown'
      return { path, docType, staleness, notes: line ? `Observed in input: ${line.trim()}` : undefined }
    })
    const output = {
      summary: `Deterministic replay classified ${scannedPaths.length} explicit corpus path(s).`,
      scannedPaths,
      gaps: paths.length ? [] : ['no .md/.mdx paths found in input'],
      openQuestions: [],
    }
    const name = request.context?.tools?.[0]?.name ?? 'submit_corpus_scanner'
    return {
      abort() {},
      async *stream() {
        yield { type: 'tool_call', toolCall: { id: 'registry-deterministic-replay', name, args: JSON.stringify(output) } }
        yield { type: 'done' }
      },
    }
  },
}

export default function run(context) {
  const documents = context.snapshot.entities
    .filter((entity) => entity.kind === 'document' && typeof entity.path === 'string')
    .map((entity) => entity.path)
  const listing = documents.map((path) => `- ${path}`).join('\n') || 'No documentation paths were supplied.'
  return createEcosystemDocBridgeCorpusScannerAgent({ adapter: deterministicAdapter }).run(listing).then((result) => {
    const proposal = {
      type: 'agent-proposal',
      schemaVersion: 1,
      contentHash: '0'.repeat(64),
      contentHashAlgo: 'sha256-normalized-v1',
      project: context.snapshot.project,
      sourceRevision: context.snapshot.sourceRevision,
      sourceRevisionKind: context.snapshot.sourceRevisionKind,
      configurationHash: context.snapshot.configurationHash,
      pipelineVersion: context.snapshot.pipelineVersion,
      analyzerVersions: { agent: AGENT_VERSION },
      proposalId: `${AGENT_ID}-${context.snapshot.contentHash.slice(0, 16)}`,
      baseSnapshotHash: context.snapshot.contentHash,
      baseReportHash: context.report.contentHash,
      relatedDiagnosticIds: context.report.diagnostics.slice(0, 64).map((diagnostic) => diagnostic.id),
      rationale: result.summary,
      confidence: 0.8,
      evidence: context.evidence.slice(0, 64),
      intendedChanges: result.gaps.length
        ? [`Review ${result.gaps.length} corpus gap(s) before changing documentation.`]
        : ['Review the classified corpus paths and staleness signals before changing documentation.'],
      origin: {
        kind: 'registry-agent',
        id: AGENT_ID,
        version: AGENT_VERSION,
        provider: 'agentskit-registry',
        capabilities: ['snapshot.read', 'evidence.read', 'proposal.write'],
      },
      checks: ['Review the Registry-agent proposal.', 'Run ak-docs reconcile after any approved documentation change.'],
    }
    return { ...proposal, contentHash: contentHashForArtifactV1(proposal) }
  })
}
