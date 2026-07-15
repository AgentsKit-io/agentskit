import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export const DOCUMENTATION_QUALITY_PROTOCOL = 'agentskit.ecosystem.documentation-quality'
export const DOC_BRIDGE_ATTESTATION_PROTOCOL = 'agentskit.doc-bridge.attestation'

export const CANONICAL_PRODUCTS = Object.freeze([
  { id: 'agentskit', repo: 'AgentsKit-io/agentskit', docsUrl: 'https://www.agentskit.io/docs' },
  { id: 'registry', repo: 'AgentsKit-io/agentskit-registry', docsUrl: 'https://registry.agentskit.io/docs' },
  { id: 'agentskit-chat', repo: 'AgentsKit-io/agentskit-chat', docsUrl: 'https://chat.agentskit.io/docs' },
  { id: 'playbook', repo: 'AgentsKit-io/agents-playbook', docsUrl: 'https://playbook.agentskit.io/docs' },
  { id: 'doc-bridge', repo: 'AgentsKit-io/doc-bridge', docsUrl: 'https://agentskit-io.github.io/doc-bridge/' },
  { id: 'code-review', repo: 'AgentsKit-io/code-review-cli', docsUrl: 'https://github.com/AgentsKit-io/code-review-cli#readme' },
  { id: 'akos', repo: 'AgentsKit-io/agentskit-os', docsUrl: 'https://akos.agentskit.io/docs' },
])

const CANONICAL_PRODUCT_IDS = CANONICAL_PRODUCTS.map(({ id }) => id)
const CANONICAL_PRODUCT_BY_ID = new Map(CANONICAL_PRODUCTS.map((product) => [product.id, product]))

const PROFILE_STATUSES = new Set(['migration', 'stable', 'deprecated'])
const VISUAL_DECISIONS = new Set(['diagram', 'interactive', 'animation', 'runnable-example', 'not-applicable'])
const HOOK_STATUSES = new Set(['linked', 'not-applicable'])

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0

function fail(path, message) {
  throw new TypeError(`documentation quality contract: ${path} ${message}`)
}

function object(value, path) {
  if (!isObject(value)) fail(path, 'must be an object')
  return value
}

function string(value, path) {
  if (!nonEmpty(value)) fail(path, 'must be a non-empty string')
  return value
}

function stringArray(value, path, { minimum = 1 } = {}) {
  if (!Array.isArray(value) || value.length < minimum) fail(path, `must contain at least ${minimum} item(s)`)
  const seen = new Set()
  for (const [index, item] of value.entries()) {
    string(item, `${path}[${index}]`)
    if (seen.has(item)) fail(`${path}[${index}]`, `duplicates ${item}`)
    seen.add(item)
  }
  return value
}

function exactKeys(value, expected, path) {
  const keys = Object.keys(object(value, path)).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(keys) !== JSON.stringify(wanted)) {
    fail(path, `must contain exactly: ${wanted.join(', ')}`)
  }
}

function budget(value, path) {
  const parsed = object(value, path)
  if (!positiveInteger(parsed.minimum)) fail(`${path}.minimum`, 'must be a positive integer')
  if (!positiveInteger(parsed.maximum)) fail(`${path}.maximum`, 'must be a positive integer')
  if (parsed.maximum < parsed.minimum) fail(`${path}.maximum`, 'must be greater than or equal to minimum')
  return parsed
}

export function parseDocumentationQualityProfile(input) {
  const profile = object(input, '$')
  if (profile.schemaVersion !== 1) fail('$.schemaVersion', 'must equal 1')
  if (profile.id !== DOCUMENTATION_QUALITY_PROTOCOL) fail('$.id', `must equal ${DOCUMENTATION_QUALITY_PROTOCOL}`)
  if (profile.version !== 1) fail('$.version', 'must equal 1')
  if (!PROFILE_STATUSES.has(profile.status)) fail('$.status', 'must be migration, stable, or deprecated')

  stringArray(profile.productIds, '$.productIds')
  if (JSON.stringify(profile.productIds) !== JSON.stringify(CANONICAL_PRODUCT_IDS)) {
    fail('$.productIds', `must equal the canonical ordered products: ${CANONICAL_PRODUCT_IDS.join(', ')}`)
  }

  const bridge = object(profile.docBridge, '$.docBridge')
  if (bridge.doctorScore !== 100) fail('$.docBridge.doctorScore', 'must equal 100')
  if (bridge.requireExactCoverage !== true) fail('$.docBridge.requireExactCoverage', 'must be true')
  if (bridge.requiredRules !== 7) fail('$.docBridge.requiredRules', 'must equal 7')
  if (bridge.recommendedRules !== 2) fail('$.docBridge.recommendedRules', 'must equal 2')
  if (bridge.allowExceptions !== false) fail('$.docBridge.allowExceptions', 'must be false')

  exactKeys(profile.machineSurfaces.reduce((result, key) => ({ ...result, [key]: true }), {}), ['llmsTxt', 'llmsFullTxt', 'rawSources', 'forAgents'], '$.machineSurfaces')

  const narrative = object(profile.narrative, '$.narrative')
  stringArray(narrative.requiredEntryPoints, '$.narrative.requiredEntryPoints')
  exactKeys(narrative.requiredEntryPoints.reduce((result, key) => ({ ...result, [key]: true }), {}), ['readme', 'humanDocs', 'forAgents'], '$.narrative.requiredEntryPoints')
  budget(narrative.readmeWordBudget, '$.narrative.readmeWordBudget')
  budget(narrative.keyJourneyWordBudget, '$.narrative.keyJourneyWordBudget')
  if (!positiveInteger(narrative.minimumKeyJourneys)) fail('$.narrative.minimumKeyJourneys', 'must be a positive integer')

  const visuals = object(profile.visuals, '$.visuals')
  stringArray(visuals.allowedDecisions, '$.visuals.allowedDecisions')
  for (const [index, decision] of visuals.allowedDecisions.entries()) {
    if (!VISUAL_DECISIONS.has(decision)) fail(`$.visuals.allowedDecisions[${index}]`, `is unknown: ${decision}`)
  }
  if (visuals.notApplicableRequiresRationale !== true) fail('$.visuals.notApplicableRequiresRationale', 'must be true')

  const discovery = object(profile.discovery, '$.discovery')
  if (discovery.globalProductCount !== 7) fail('$.discovery.globalProductCount', 'must equal 7')
  if (discovery.siblingDestinationCount !== 6) fail('$.discovery.siblingDestinationCount', 'must equal 6')
  const componentProducts = stringArray(discovery.ecosystemComponentProducts, '$.discovery.ecosystemComponentProducts')
  const excludedProducts = stringArray(discovery.ecosystemComponentExcludedProducts, '$.discovery.ecosystemComponentExcludedProducts')
  if (excludedProducts.length !== 1 || excludedProducts[0] !== 'akos') {
    fail('$.discovery.ecosystemComponentExcludedProducts', 'must contain only akos')
  }
  const combined = new Set([...componentProducts, ...excludedProducts])
  if (combined.size !== profile.productIds.length || profile.productIds.some((id) => !combined.has(id))) {
    fail('$.discovery.ecosystemComponentProducts', 'must partition the seven canonical products with the exclusions')
  }
  const hooks = object(discovery.contextualHooks, '$.discovery.contextualHooks')
  exactKeys(hooks, ['documentation', 'chat', 'enterprise'], '$.discovery.contextualHooks')
  if (hooks.documentation !== 'doc-bridge' || hooks.chat !== 'agentskit-chat' || hooks.enterprise !== 'akos') {
    fail('$.discovery.contextualHooks', 'must route documentation to doc-bridge, chat to agentskit-chat, and enterprise to akos')
  }

  return profile
}

export function parseDocumentationQualityEvidence(input, profileInput) {
  const profile = parseDocumentationQualityProfile(profileInput)
  const evidence = object(input, '$')
  if (evidence.schemaVersion !== 1) fail('$.schemaVersion', 'must equal 1')
  if (evidence.profileId !== profile.id || evidence.profileVersion !== profile.version) {
    fail('$.profileId', 'must match the documentation quality profile')
  }
  string(evidence.productId, '$.productId')
  if (!profile.productIds.includes(evidence.productId)) fail('$.productId', `references unknown product ${evidence.productId}`)
  string(evidence.repo, '$.repo')
  const canonicalProduct = CANONICAL_PRODUCT_BY_ID.get(evidence.productId)
  if (evidence.repo !== canonicalProduct.repo) fail('$.repo', `must equal ${canonicalProduct.repo} for ${evidence.productId}`)
  string(evidence.commit, '$.commit')
  if (!/^[0-9a-f]{7,40}$/.test(evidence.commit)) fail('$.commit', 'must be a lowercase Git commit SHA')
  string(evidence.auditedOn, '$.auditedOn')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(evidence.auditedOn) || Number.isNaN(Date.parse(`${evidence.auditedOn}T00:00:00Z`))) {
    fail('$.auditedOn', 'must be a valid YYYY-MM-DD date')
  }

  const bridge = object(evidence.docBridge, '$.docBridge')
  string(bridge.artifact, '$.docBridge.artifact')
  const coverage = object(bridge.coverage, '$.docBridge.coverage')
  for (const audience of ['agent', 'human']) {
    const row = object(coverage[audience], `$.docBridge.coverage.${audience}`)
    if (!Number.isSafeInteger(row.ready) || row.ready < 0) fail(`$.docBridge.coverage.${audience}.ready`, 'must be a non-negative integer')
    if (!positiveInteger(row.total)) fail(`$.docBridge.coverage.${audience}.total`, 'must be a positive integer')
  }
  const conformance = object(bridge.conformance, '$.docBridge.conformance')
  for (const key of ['requiredPassed', 'requiredTotal', 'requiredExcepted', 'recommendedPassed', 'recommendedTotal', 'recommendedExcepted']) {
    if (!Number.isSafeInteger(conformance[key]) || conformance[key] < 0) fail(`$.docBridge.conformance.${key}`, 'must be a non-negative integer')
  }

  const surfaces = object(evidence.machineSurfaces, '$.machineSurfaces')
  string(surfaces.llmsTxt, '$.machineSurfaces.llmsTxt')
  string(surfaces.llmsFullTxt, '$.machineSurfaces.llmsFullTxt')
  stringArray(surfaces.rawSources, '$.machineSurfaces.rawSources')
  string(surfaces.forAgents, '$.machineSurfaces.forAgents')

  const attestation = object(evidence.attestation, '$.attestation')
  if (!['commit', 'working-tree'].includes(attestation.sourceMode)) fail('$.attestation.sourceMode', 'must be commit or working-tree')
  string(attestation.contentDigest, '$.attestation.contentDigest')
  if (!/^sha256:[0-9a-f]{64}$/.test(attestation.contentDigest)) fail('$.attestation.contentDigest', 'must be a sha256 digest')

  const narrative = object(evidence.narrative, '$.narrative')
  string(narrative.readme, '$.narrative.readme')
  if (!positiveInteger(narrative.readmeWordCount)) fail('$.narrative.readmeWordCount', 'must be a positive integer')
  string(narrative.humanDocs, '$.narrative.humanDocs')
  string(narrative.forAgents, '$.narrative.forAgents')
  if (!Array.isArray(narrative.keyJourneys)) fail('$.narrative.keyJourneys', 'must be an array')
  const journeyIds = new Set()
  for (const [index, rawJourney] of narrative.keyJourneys.entries()) {
    const path = `$.narrative.keyJourneys[${index}]`
    const journey = object(rawJourney, path)
    const id = string(journey.id, `${path}.id`)
    if (journeyIds.has(id)) fail(`${path}.id`, `duplicates ${id}`)
    journeyIds.add(id)
    string(journey.path, `${path}.path`)
    if (!positiveInteger(journey.wordCount)) fail(`${path}.wordCount`, 'must be a positive integer')
    if (!VISUAL_DECISIONS.has(journey.visualDecision)) fail(`${path}.visualDecision`, 'must be an allowed visual decision')
    stringArray(journey.evidence, `${path}.evidence`)
    if (journey.visualDecision === 'not-applicable') string(journey.rationale, `${path}.rationale`)
  }

  const discovery = object(evidence.discovery, '$.discovery')
  stringArray(discovery.globalProductIds, '$.discovery.globalProductIds')
  stringArray(discovery.siblingProductIds, '$.discovery.siblingProductIds', { minimum: 0 })
  if (!Array.isArray(discovery.contextualHooks)) fail('$.discovery.contextualHooks', 'must be an array')
  const hookIds = new Set()
  for (const [index, rawHook] of discovery.contextualHooks.entries()) {
    const path = `$.discovery.contextualHooks[${index}]`
    const hook = object(rawHook, path)
    const id = string(hook.id, `${path}.id`)
    if (hookIds.has(id)) fail(`${path}.id`, `duplicates ${id}`)
    hookIds.add(id)
    if (!HOOK_STATUSES.has(hook.status)) fail(`${path}.status`, 'must be linked or not-applicable')
    string(hook.targetProductId, `${path}.targetProductId`)
    stringArray(hook.evidence, `${path}.evidence`)
    if (hook.status === 'not-applicable') string(hook.rationale, `${path}.rationale`)
  }

  return evidence
}

export function countDocumentationWords(source) {
  const prose = source
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
  return prose.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0
}

function localPath(root, value) {
  if (!root || !nonEmpty(value) || /^https:\/\//.test(value)) return null
  return resolve(root, value.split('#')[0])
}

export function documentationEvidencePaths(evidence) {
  return [...new Set([
    evidence.machineSurfaces.llmsTxt,
    evidence.machineSurfaces.llmsFullTxt,
    ...evidence.machineSurfaces.rawSources,
    evidence.machineSurfaces.forAgents,
    evidence.narrative.readme,
    evidence.narrative.humanDocs,
    evidence.narrative.forAgents,
    ...evidence.narrative.keyJourneys.flatMap((journey) => [journey.path, ...journey.evidence]),
    ...evidence.discovery.contextualHooks.flatMap((hook) => hook.evidence),
  ].filter((value) => !/^https?:\/\//.test(value)).map((value) => value.split('#')[0]))].sort()
}

function filesUnder(path, relativePath) {
  if (!existsSync(path)) return []
  if (!statSync(path).isDirectory()) return [{ path, relativePath }]
  return readdirSync(path, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => filesUnder(resolve(path, entry.name), `${relativePath}/${entry.name}`))
}

export function computeDocumentationEvidenceDigest(root, evidence) {
  const hash = createHash('sha256')
  for (const evidencePath of documentationEvidencePaths(evidence)) {
    const absolutePath = resolve(root, evidencePath)
    if (!existsSync(absolutePath)) continue
    for (const file of filesUnder(absolutePath, evidencePath)) {
      hash.update(file.relativePath)
      hash.update('\0')
      hash.update(readFileSync(file.path))
      hash.update('\0')
    }
  }
  return `sha256:${hash.digest('hex')}`
}

function readEvidenceContent(root, values) {
  return values.flatMap((value) => {
    const path = localPath(root, value)
    if (!path || !existsSync(path)) return []
    return filesUnder(path, value.split('#')[0]).map((file) => readFileSync(file.path, 'utf8'))
  }).join('\n')
}

function visualEvidenceMatches(decision, content) {
  if (decision === 'not-applicable') return true
  if (decision === 'diagram') return /```mermaid\b|<Mermaid\b/i.test(content)
  if (decision === 'animation') return /!\[[^\]]*\]\([^)]*\.(?:gif|webm|mp4)|\banimation\b/i.test(content)
  if (decision === 'interactive') return /\binteractive\b|\b(?:test|describe|it)\s*\(|\bexpect\s*\(|\bpage\./i.test(content)
  return /```(?:bash|sh|shell|ts|tsx|js|javascript)\b|\b(?:test|describe|it)\s*\(/i.test(content)
}

function metricsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function verifyDocBridgeArtifact(evidence, attestationRoot, findings) {
  const artifactPath = localPath(attestationRoot, evidence.docBridge.artifact)
  if (!artifactPath || !existsSync(artifactPath)) {
    findings.push({ id: 'doc-bridge-artifact', message: `Doc Bridge artifact does not exist: ${evidence.docBridge.artifact}` })
    return null
  }
  let artifact
  try {
    artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
  } catch {
    findings.push({ id: 'doc-bridge-artifact', message: `Doc Bridge artifact is not valid JSON: ${evidence.docBridge.artifact}` })
    return null
  }
  const expected = {
    doctorScore: evidence.docBridge.doctorScore,
    coverage: evidence.docBridge.coverage,
    conformance: evidence.docBridge.conformance,
  }
  const validIdentity = artifact.schemaVersion === 1
    && artifact.protocol === DOC_BRIDGE_ATTESTATION_PROTOCOL
    && artifact.productId === evidence.productId
    && artifact.repo === evidence.repo
    && artifact.commit === evidence.commit
    && artifact.sourceMode === evidence.attestation.sourceMode
    && artifact.contentDigest === evidence.attestation.contentDigest
    && nonEmpty(artifact.command)
  if (!validIdentity || !metricsEqual(artifact.metrics, expected)) {
    findings.push({ id: 'doc-bridge-artifact', message: `Doc Bridge artifact does not match the evidence identity, digest, command, or metrics: ${evidence.docBridge.artifact}` })
    return null
  }
  return artifact
}

function runDocBridgeJson(root, args) {
  const installed = resolve(root, 'node_modules/.bin/ak-docs')
  const selfHosted = resolve(root, 'bin/ak-docs.js')
  if (existsSync(installed)) return JSON.parse(execFileSync(installed, args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }))
  if (existsSync(selfHosted)) return JSON.parse(execFileSync(process.execPath, [selfHosted, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }))
  throw new Error('ak-docs executable was not found in node_modules/.bin or bin/ak-docs.js')
}

function verifyLiveDocBridge(evidence, root, artifact, findings) {
  let doctor
  let conformance
  try {
    doctor = runDocBridgeJson(root, ['doctor', '--json'])
    conformance = runDocBridgeJson(root, ['conformance', 'run', 'documentation-standard-v1', '--json'])
  } catch (error) {
    findings.push({ id: 'doc-bridge-live', message: `Doc Bridge live verification failed: ${error.message}` })
    return false
  }
  const packages = doctor?.coverage?.packages
  const required = conformance?.summary?.required
  const recommended = conformance?.summary?.recommended
  const metrics = {
    doctorScore: doctor?.score,
    coverage: {
      agent: { ready: packages?.withAgentDoc, total: packages?.total },
      human: { ready: packages?.withHumanDoc, total: packages?.total },
    },
    conformance: {
      requiredPassed: required?.passed,
      requiredTotal: (required?.passed ?? 0) + (required?.failed ?? 0) + (required?.excepted ?? 0),
      requiredExcepted: required?.excepted,
      recommendedPassed: recommended?.passed,
      recommendedTotal: (recommended?.passed ?? 0) + (recommended?.failed ?? 0) + (recommended?.excepted ?? 0),
      recommendedExcepted: recommended?.excepted,
    },
  }
  const expected = {
    doctorScore: evidence.docBridge.doctorScore,
    coverage: evidence.docBridge.coverage,
    conformance: evidence.docBridge.conformance,
  }
  if (!doctor?.ok || !conformance?.ok || !conformance?.recommendedOk || !metricsEqual(metrics, expected) || !artifact || !metricsEqual(metrics, artifact.metrics)) {
    findings.push({ id: 'doc-bridge-live', message: 'Live Doc Bridge doctor/conformance metrics do not match the payload and artifact' })
    return false
  }
  return true
}

export function evaluateDocumentationQuality(profileInput, evidenceInput, { root, attestationRoot, verifyAttestation = false } = {}) {
  const profile = parseDocumentationQualityProfile(profileInput)
  const evidence = parseDocumentationQualityEvidence(evidenceInput, profile)
  const findings = []
  const add = (id, message) => findings.push({ id, message })

  if (evidence.docBridge.doctorScore !== profile.docBridge.doctorScore) add('doc-bridge-score', `doctor score is ${evidence.docBridge.doctorScore}, expected exactly ${profile.docBridge.doctorScore}`)
  for (const audience of ['agent', 'human']) {
    const row = evidence.docBridge.coverage[audience]
    if (row.ready !== row.total) add(`${audience}-coverage`, `${row.ready}/${row.total} is not exact full coverage`)
  }
  const conformance = evidence.docBridge.conformance
  if (conformance.requiredPassed !== profile.docBridge.requiredRules || conformance.requiredTotal !== profile.docBridge.requiredRules || conformance.requiredExcepted !== 0) {
    add('required-conformance', `required conformance is ${conformance.requiredPassed}/${conformance.requiredTotal} with ${conformance.requiredExcepted} excepted`)
  }
  if (conformance.recommendedPassed !== profile.docBridge.recommendedRules || conformance.recommendedTotal !== profile.docBridge.recommendedRules || conformance.recommendedExcepted !== 0) {
    add('recommended-conformance', `recommended conformance is ${conformance.recommendedPassed}/${conformance.recommendedTotal} with ${conformance.recommendedExcepted} excepted`)
  }

  const declaredPaths = documentationEvidencePaths(evidence)
  for (const value of declaredPaths) {
    const path = localPath(root, value)
    if (path && !existsSync(path)) add(`missing-path:${value}`, `declared evidence path does not exist: ${value}`)
  }

  let readmeWordCount = evidence.narrative.readmeWordCount
  const readmePath = localPath(root, evidence.narrative.readme)
  if (readmePath && existsSync(readmePath)) {
    readmeWordCount = countDocumentationWords(readFileSync(readmePath, 'utf8'))
    if (readmeWordCount !== evidence.narrative.readmeWordCount) add('readme-word-count-drift', `declared ${evidence.narrative.readmeWordCount}, measured ${readmeWordCount}`)
  }
  const readmeBudget = profile.narrative.readmeWordBudget
  if (readmeWordCount < readmeBudget.minimum || readmeWordCount > readmeBudget.maximum) {
    add('readme-budget', `README has ${readmeWordCount} words; expected ${readmeBudget.minimum}-${readmeBudget.maximum}`)
  }
  if (evidence.narrative.keyJourneys.length < profile.narrative.minimumKeyJourneys) {
    add('key-journey-count', `found ${evidence.narrative.keyJourneys.length} key journeys; expected at least ${profile.narrative.minimumKeyJourneys}`)
  }
  const journeyBudget = profile.narrative.keyJourneyWordBudget
  for (const journey of evidence.narrative.keyJourneys) {
    let wordCount = journey.wordCount
    const path = localPath(root, journey.path)
    if (path && existsSync(path)) {
      wordCount = countDocumentationWords(readFileSync(path, 'utf8'))
      if (wordCount !== journey.wordCount) add(`journey-word-count-drift:${journey.id}`, `declared ${journey.wordCount}, measured ${wordCount}`)
    }
    if (wordCount < journeyBudget.minimum || wordCount > journeyBudget.maximum) {
      add(`journey-budget:${journey.id}`, `${journey.id} has ${wordCount} words; expected ${journeyBudget.minimum}-${journeyBudget.maximum}`)
    }
    if (root && !visualEvidenceMatches(journey.visualDecision, readEvidenceContent(root, journey.evidence))) {
      add(`journey-visual:${journey.id}`, `${journey.id} evidence does not substantiate ${journey.visualDecision}`)
    }
  }

  if (JSON.stringify(evidence.discovery.globalProductIds) !== JSON.stringify(profile.productIds)) {
    add('global-products', 'global navigation does not list the canonical seven products in order')
  }
  const expectedSiblings = profile.productIds.filter((id) => id !== evidence.productId)
  const actualSiblings = [...evidence.discovery.siblingProductIds].sort()
  const shouldRenderComponent = profile.discovery.ecosystemComponentProducts.includes(evidence.productId)
  if (shouldRenderComponent && JSON.stringify(actualSiblings) !== JSON.stringify([...expectedSiblings].sort())) {
    add('sibling-destinations', 'ecosystem continuation does not expose the other six products')
  }
  if (!shouldRenderComponent && evidence.discovery.siblingProductIds.length > 0) {
    add('excluded-component', `${evidence.productId} must not render the ecosystem continuation component`)
  }

  const hooks = new Map(evidence.discovery.contextualHooks.map((hook) => [hook.id, hook]))
  for (const [id, targetProductId] of Object.entries(profile.discovery.contextualHooks)) {
    const hook = hooks.get(id)
    if (!hook) add(`contextual-hook:${id}`, `missing contextual hook review for ${id}`)
    else if (hook.targetProductId !== targetProductId) add(`contextual-hook:${id}`, `${id} points to ${hook.targetProductId}, expected ${targetProductId}`)
    else if (root && hook.status === 'linked') {
      const target = CANONICAL_PRODUCT_BY_ID.get(targetProductId)
      const content = readEvidenceContent(root, hook.evidence).toLowerCase()
      const tokens = [target.id, target.id.replaceAll('-', ' '), target.repo, target.docsUrl].map((token) => token.toLowerCase())
      if (!tokens.some((token) => content.includes(token))) add(`contextual-hook-evidence:${id}`, `${id} evidence does not reference ${targetProductId}`)
    }
  }

  let attestationVerified = false
  let docBridgeLiveVerified = false
  if (verifyAttestation) {
    if (!root) add('attestation-root', 'a repository root is required to verify the content attestation')
    if (!attestationRoot) add('attestation-artifact-root', 'an attestation artifact root is required')
    if (root) {
      let head = ''
      try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() } catch {}
      if (evidence.attestation.sourceMode === 'commit') {
        let status = ''
        try { status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() } catch { status = 'unavailable' }
        if (status) add('attestation-dirty', 'sourceMode commit requires a clean working tree')
        let commitExists = false
        try {
          execFileSync('git', ['cat-file', '-e', `${evidence.commit}^{commit}`], { cwd: root, stdio: 'ignore' })
          commitExists = true
        } catch {}
        if (!commitExists) {
          add('attestation-commit', `declared content commit ${evidence.commit} is unavailable`)
        } else {
          let isAncestor = false
          try {
            execFileSync('git', ['merge-base', '--is-ancestor', evidence.commit, 'HEAD'], { cwd: root, stdio: 'ignore' })
            isAncestor = true
          } catch {}
          if (!isAncestor) add('attestation-commit', `declared content commit ${evidence.commit} is not an ancestor of repository HEAD ${head || 'unavailable'}`)

          let evidenceChanged = true
          try {
            execFileSync('git', ['diff', '--quiet', evidence.commit, 'HEAD', '--', ...documentationEvidencePaths(evidence)], { cwd: root, stdio: 'ignore' })
            evidenceChanged = false
          } catch {}
          if (evidenceChanged) add('attestation-commit-drift', `certified documentation paths changed after ${evidence.commit}`)
        }
      } else if (head !== evidence.commit) {
        add('attestation-commit', `repository HEAD is ${head || 'unavailable'}, expected working-tree base commit ${evidence.commit}`)
      }
      const measuredDigest = computeDocumentationEvidenceDigest(root, evidence)
      if (measuredDigest !== evidence.attestation.contentDigest) add('attestation-digest', `content digest is ${measuredDigest}, expected ${evidence.attestation.contentDigest}`)
    }
    const artifact = attestationRoot ? verifyDocBridgeArtifact(evidence, attestationRoot, findings) : null
    docBridgeLiveVerified = root ? verifyLiveDocBridge(evidence, root, artifact, findings) : false
    attestationVerified = findings.length === 0 && Boolean(artifact) && docBridgeLiveVerified
  }

  return {
    protocol: profile.id,
    profileVersion: profile.version,
    productId: evidence.productId,
    certified: profile.status === 'stable' && findings.length === 0 && attestationVerified,
    eligible: findings.length === 0,
    attestationVerified,
    docBridgeLiveVerified,
    profileStatus: profile.status,
    findings,
  }
}

export function evaluateDocumentationQualityMatrix(profileInput, evidenceInputs, { roots = {}, requireRoots = false, attestationRoot, verifyAttestation = false } = {}) {
  const profile = parseDocumentationQualityProfile(profileInput)
  if (!Array.isArray(evidenceInputs)) fail('$.evidence', 'must be an array')

  const findings = []
  const evidenceByProduct = new Map()
  for (const evidence of evidenceInputs) {
    const parsed = parseDocumentationQualityEvidence(evidence, profile)
    if (evidenceByProduct.has(parsed.productId)) {
      findings.push({ id: `duplicate-product:${parsed.productId}`, message: `multiple evidence payloads found for ${parsed.productId}` })
      continue
    }
    evidenceByProduct.set(parsed.productId, parsed)
  }

  const products = profile.productIds.map((productId) => {
    const evidence = evidenceByProduct.get(productId)
    if (!evidence) {
      const finding = { id: `missing-product:${productId}`, message: `missing evidence payload for ${productId}` }
      findings.push(finding)
      return { productId, certified: false, eligible: false, profileStatus: profile.status, findings: [finding] }
    }
    const root = roots[productId]
    if (requireRoots && !root) {
      const finding = { id: `missing-root:${productId}`, message: `local repository root is required for ${productId}` }
      findings.push(finding)
      return { productId, certified: false, eligible: false, profileStatus: profile.status, findings: [finding] }
    }
    const result = evaluateDocumentationQuality(profile, evidence, { root, attestationRoot, verifyAttestation })
    for (const finding of result.findings) findings.push({ ...finding, productId })
    return result
  })

  for (const productId of evidenceByProduct.keys()) {
    if (!profile.productIds.includes(productId)) findings.push({ id: `unexpected-product:${productId}`, message: `unexpected evidence payload for ${productId}` })
  }

  const eligible = findings.length === 0 && products.every((product) => product.eligible)
  return {
    protocol: profile.id,
    profileVersion: profile.version,
    profileStatus: profile.status,
    certified: profile.status === 'stable' && eligible && products.every((product) => product.certified),
    eligible,
    productCount: products.length,
    products,
    findings,
  }
}
