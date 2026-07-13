import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'

export const README_STANDARD_ID = 'agentskit-readme-standard-v1'
export const README_STANDARD_VERSION = 1

const REQUIRED_DIMENSIONS = [
  'promise',
  'proof',
  'examples',
  'visuals',
  'maturity',
  'compatibility',
  'contribution',
  'metadata',
  'ecosystem',
]

const VALID_PROFILES = new Set(['top-level-repository', 'public-app', 'major-package', 'concise-package'])
const VALID_DARK_MODE = new Set(['neutral', 'paired'])
const NON_CONTENT_IMAGE_URL = /^(?:(?:https?:)?\/\/(?:img\.shields\.io|bundlephobia\.com|bundlejs\.com)(?:\/|$)|(?:https?:)?\/\/api\.producthunt\.com\/widgets(?:\/|$))/
const COMPLETE_EXCEPTION_FIELDS = ['ruleId', 'reason', 'approvedBy', 'trackingUrl', 'reviewOn']
const EXCEPTION_RULES = new Set([
  ...REQUIRED_DIMENSIONS,
  'badge-budget',
  'image-budget',
  'visual-exception',
  'image-accessibility',
  'visual-files',
  'dark-mode',
  'command-verification',
  'example-verification',
  'freshness',
])

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0
const safeRelative = value => nonEmpty(value) && !isAbsolute(value) && !value.includes('\\') && !value.split('/').includes('..')
const pathExists = (root, path) => existsSync(join(root, path))
const read = (root, path) => readFileSync(join(root, path), 'utf8')
const dateValue = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? Date.parse(`${value}T00:00:00Z`) : Number.NaN

export function parseReadmeStandard(input) {
  if (!isObject(input)) throw new Error('README standard must be an object')
  if (input.schemaVersion !== README_STANDARD_VERSION) throw new Error('README standard schemaVersion must be 1')
  if (input.standardId !== README_STANDARD_ID) throw new Error(`README standardId must be ${README_STANDARD_ID}`)
  if (input.status !== 'approved') throw new Error('README Standard v1 must be approved before rollout')
  if (!isObject(input.approval) || !nonEmpty(input.approval.approvedBy) || Number.isNaN(dateValue(input.approval.approvedOn))) {
    throw new Error('README standard approval requires approvedBy and approvedOn')
  }
  if (!Array.isArray(input.profiles) || input.profiles.length !== VALID_PROFILES.size) {
    throw new Error('README standard must define all four profiles')
  }
  const profileIds = new Set()
  for (const profile of input.profiles) {
    if (!VALID_PROFILES.has(profile.id)) throw new Error(`Unknown README profile: ${profile.id}`)
    if (profileIds.has(profile.id)) throw new Error(`Duplicate README profile: ${profile.id}`)
    profileIds.add(profile.id)
    const budgets = profile.budgets
    if (!isObject(budgets)) throw new Error(`${profile.id} must define budgets`)
    for (const key of ['badges', 'images', 'accessibility', 'darkMode', 'commandVerification', 'freshness']) {
      if (!isObject(budgets[key])) throw new Error(`${profile.id} must define the ${key} budget`)
    }
    if (!Number.isInteger(budgets.badges.max) || budgets.badges.max < 0) throw new Error(`${profile.id} badge max is invalid`)
    if (!Number.isInteger(budgets.images.min) || !Number.isInteger(budgets.images.max) || budgets.images.max < budgets.images.min) {
      throw new Error(`${profile.id} image range is invalid`)
    }
    if (budgets.accessibility.maxMissingAlt !== 0) throw new Error(`${profile.id} must allow zero missing alt text`)
    if (budgets.darkMode.requireStrategy !== true) throw new Error(`${profile.id} must require a dark-mode strategy`)
    if (budgets.commandVerification.maxUnverifiedPrimary !== 0) throw new Error(`${profile.id} must allow zero unverified primary commands`)
    if (!Number.isInteger(budgets.freshness.reviewCadenceDays) || budgets.freshness.reviewCadenceDays < 1) {
      throw new Error(`${profile.id} freshness cadence is invalid`)
    }
    if (budgets.freshness.requireSourceHash !== true) throw new Error(`${profile.id} must require source hashes`)
  }
  if (!Array.isArray(input.surfaces) || input.surfaces.length === 0) throw new Error('README standard needs at least one surface')
  const surfaceIds = new Set()
  for (const surface of input.surfaces) {
    if (!nonEmpty(surface.id) || !nonEmpty(surface.path) || !profileIds.has(surface.profileId)) {
      throw new Error('Every README surface needs an id, path, and valid profileId')
    }
    if (surfaceIds.has(surface.id)) throw new Error(`Duplicate README surface: ${surface.id}`)
    surfaceIds.add(surface.id)
    if (!safeRelative(surface.path)) throw new Error(`${surface.id} README path must stay inside the repository`)
    if (!isObject(surface.dimensions)) throw new Error(`${surface.id} must declare dimensions`)
    for (const dimension of REQUIRED_DIMENSIONS) {
      if (!Array.isArray(surface.dimensions[dimension]) || surface.dimensions[dimension].length === 0 || surface.dimensions[dimension].some(marker => !nonEmpty(marker))) {
        throw new Error(`${surface.id} must declare non-empty ${dimension} markers`)
      }
    }
    if (!Array.isArray(surface.visuals) || !Array.isArray(surface.commands) || !Array.isArray(surface.examples)) {
      throw new Error(`${surface.id} must declare visuals, commands, and examples`)
    }
    if (surface.commands.length === 0 || surface.examples.length === 0) throw new Error(`${surface.id} must verify at least one command and example`)
    for (const [label, values] of [['command', surface.commands], ['example', surface.examples]]) {
      const ids = values.map(value => value.id)
      if (ids.some(id => !nonEmpty(id)) || new Set(ids).size !== ids.length) throw new Error(`${surface.id} has invalid or duplicate ${label} IDs`)
    }
    for (const visual of surface.visuals) {
      if (!safeRelative(visual.src) || (visual.lightSrc !== undefined && !safeRelative(visual.lightSrc)) || (visual.darkSrc !== undefined && !safeRelative(visual.darkSrc))) {
        throw new Error(`${surface.id} visual paths must stay inside the repository`)
      }
    }
    for (const command of surface.commands) {
      if (!safeRelative(command.test)) throw new Error(`${surface.id} command test paths must stay inside the repository`)
    }
    for (const example of surface.examples) {
      if (!safeRelative(example.fixture) || !safeRelative(example.test)) throw new Error(`${surface.id} example paths must stay inside the repository`)
    }
    if (!isObject(surface.freshness) || !Array.isArray(surface.freshness.sources) || !nonEmpty(surface.freshness.sourceHash)) {
      throw new Error(`${surface.id} must declare freshness sources and sourceHash`)
    }
    if (surface.freshness.sources.length === 0 || surface.freshness.sources.some(path => !safeRelative(path))) {
      throw new Error(`${surface.id} freshness sources must stay inside the repository`)
    }
    if (Number.isNaN(dateValue(surface.freshness.reviewedOn)) || Number.isNaN(dateValue(surface.freshness.reviewDueOn))) {
      throw new Error(`${surface.id} freshness dates must use YYYY-MM-DD`)
    }
    for (const exception of surface.exceptions ?? []) {
      const missing = COMPLETE_EXCEPTION_FIELDS.filter(field => !nonEmpty(exception[field]))
      if (missing.length > 0) throw new Error(`${surface.id} exception is missing: ${missing.join(', ')}`)
      if (!EXCEPTION_RULES.has(exception.ruleId)) throw new Error(`${surface.id} exception targets an unknown rule: ${exception.ruleId}`)
      if (!/^https:\/\//.test(exception.trackingUrl) || Number.isNaN(dateValue(exception.reviewOn))) {
        throw new Error(`${surface.id} exception trackingUrl or reviewOn is invalid`)
      }
    }
  }
  return structuredClone(input)
}

export function computeReadmeSourceHash(root, paths) {
  const hash = createHash('sha256')
  for (const path of [...paths].sort()) {
    hash.update(path)
    hash.update('\0')
    hash.update(read(root, path))
    hash.update('\0')
  }
  return `sha256:${hash.digest('hex')}`
}

function imageRecords(markdown) {
  const records = []
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    records.push({ alt: match[1].trim(), src: match[2] })
  }
  for (const match of markdown.matchAll(/<img\s+([^>]+)>/gi)) {
    const attrs = match[1]
    records.push({
      alt: attrs.match(/\balt=["']([^"']*)["']/i)?.[1]?.trim() ?? '',
      src: attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? '',
    })
  }
  return records
}

function markedFences(markdown, type) {
  const records = new Map()
  const expression = new RegExp('<!--\\s*readme-' + type + ':([a-z0-9-]+)\\s*-->\\s*\\n```[^\\n]*\\n([\\s\\S]*?)\\n```', 'gi')
  for (const match of markdown.matchAll(expression)) records.set(match[1], match[2].trim())
  return records
}

function result(ruleId, status, message, evidence, remediation, level = 'required') {
  return { ruleId, level, status, message, evidence: [...evidence].sort(), remediation }
}

function applyException(rule, surface, today) {
  if (rule.status !== 'fail') return rule
  const exception = (surface.exceptions ?? []).find(item => item.ruleId === rule.ruleId)
  if (!exception || dateValue(exception.reviewOn) < dateValue(today)) return rule
  return {
    ...rule,
    status: 'excepted',
    message: `${rule.message} Approved exception: ${exception.reason}`,
    evidence: [...rule.evidence, exception.trackingUrl].sort(),
  }
}

function auditSurface(config, surface, root, today) {
  const profile = config.profiles.find(item => item.id === surface.profileId)
  const readmePath = join(root, surface.path)
  if (!existsSync(readmePath)) {
    return {
      id: surface.id,
      path: surface.path,
      profileId: surface.profileId,
      status: 'fail',
      rules: [result('readme-exists', 'fail', `${surface.path} does not exist.`, [surface.path], `Create ${surface.path}.`)],
    }
  }

  const markdown = readFileSync(readmePath, 'utf8')
  const rules = []
  for (const dimension of REQUIRED_DIMENSIONS) {
    const missing = surface.dimensions[dimension].filter(marker => !markdown.includes(marker))
    rules.push(result(
      dimension,
      missing.length === 0 ? 'pass' : 'fail',
      missing.length === 0 ? `${dimension} evidence is present.` : `Missing ${dimension} marker(s): ${missing.join(', ')}`,
      [surface.path, ...surface.dimensions[dimension]],
      `Restore the declared ${dimension} evidence in ${surface.path}.`,
    ))
  }

  const badgeCount = (markdown.match(/https:\/\/img\.shields\.io\//g) ?? []).length
  rules.push(result(
    'badge-budget',
    badgeCount <= profile.budgets.badges.max ? 'pass' : 'fail',
    `${badgeCount}/${profile.budgets.badges.max} badges used.`,
    [surface.path],
    `Reduce shields.io badges to at most ${profile.budgets.badges.max}.`,
  ))

  const images = imageRecords(markdown)
  const contentImages = images.filter(image => !NON_CONTENT_IMAGE_URL.test(image.src))
  const imageBudget = profile.budgets.images
  const imageRangePass = contentImages.length >= imageBudget.min && contentImages.length <= imageBudget.max
  rules.push(result(
    'image-budget',
    imageRangePass ? 'pass' : 'fail',
    `${contentImages.length} content image(s); profile range is ${imageBudget.min}–${imageBudget.max}.`,
    [surface.path],
    `Keep ${surface.path} within the ${imageBudget.min}–${imageBudget.max} image budget.`,
  ))
  if (contentImages.length === 0 && imageBudget.zeroRequiresException) {
    rules.push(result('visual-exception', 'fail', 'Zero images require an approved explanation.', [surface.path], 'Add a useful visual or approve a visual-exception.'))
  }

  const missingAlt = images.filter(image => !image.alt)
  rules.push(result(
    'image-accessibility',
    missingAlt.length === 0 ? 'pass' : 'fail',
    missingAlt.length === 0 ? 'Every image has alt text.' : `${missingAlt.length} image(s) have empty or missing alt text.`,
    [surface.path, ...missingAlt.map(image => image.src)],
    'Add meaningful alt text, or explicitly mark a decorative image outside README content.',
  ))

  const readmeDir = dirname(surface.path)
  const localImages = images
    .filter(image => !/^(?:https?:)?\/\//.test(image.src))
    .map(image => join(readmeDir, image.src.replace(/^\//, '').split(/[?#]/, 1)[0]))
  const declarations = new Map(surface.visuals.map(visual => [visual.src.replace(/^\.\//, ''), visual]))
  const undeclared = localImages.filter(src => !declarations.has(src))
  const missingFiles = [...declarations.keys()].filter(src => !pathExists(root, src))
  rules.push(result(
    'visual-files',
    undeclared.length === 0 && missingFiles.length === 0 ? 'pass' : 'fail',
    undeclared.length === 0 && missingFiles.length === 0 ? 'Local visuals resolve and are declared.' : `Undeclared: ${undeclared.join(', ') || 'none'}; missing: ${missingFiles.join(', ') || 'none'}.`,
    [surface.path, ...localImages, ...declarations.keys()],
    'Declare every local README image and keep each declared visual on disk.',
  ))
  const invalidDarkMode = surface.visuals.filter(visual => {
    if (!VALID_DARK_MODE.has(visual.darkMode)) return true
    return visual.darkMode === 'paired' && (!nonEmpty(visual.lightSrc) || !nonEmpty(visual.darkSrc) || !pathExists(root, visual.lightSrc) || !pathExists(root, visual.darkSrc))
  })
  rules.push(result(
    'dark-mode',
    invalidDarkMode.length === 0 ? 'pass' : 'fail',
    invalidDarkMode.length === 0 ? 'Every declared visual has a valid dark-mode strategy.' : `Invalid dark-mode declarations: ${invalidDarkMode.map(item => item.src).join(', ')}`,
    surface.visuals.map(visual => visual.src),
    'Declare neutral visuals or existing paired light/dark assets.',
  ))

  const commandFences = markedFences(markdown, 'command')
  const declaredCommands = new Map(surface.commands.map(command => [command.id, command]))
  const invalidCommands = [...commandFences].filter(([id, content]) => {
    const command = declaredCommands.get(id)
    return !command || command.command.trim() !== content || !pathExists(root, command.test) || !nonEmpty(command.testCommand)
  })
  const missingCommands = [...declaredCommands.keys()].filter(id => !commandFences.has(id))
  rules.push(result(
    'command-verification',
    invalidCommands.length === 0 && missingCommands.length === 0 ? 'pass' : 'fail',
    invalidCommands.length === 0 && missingCommands.length === 0 ? `${commandFences.size} primary command(s) have committed test evidence.` : `Invalid commands: ${invalidCommands.map(([id]) => id).join(', ') || 'none'}; missing markers: ${missingCommands.join(', ') || 'none'}.`,
    [surface.path, ...surface.commands.map(command => command.test)],
    'Synchronize each readme-command fence with its declaration and committed test evidence.',
  ))

  const exampleFences = markedFences(markdown, 'example')
  const invalidExamples = surface.examples.filter(example => {
    const content = exampleFences.get(example.id)
    return !content || !pathExists(root, example.fixture) || content !== read(root, example.fixture).trim() || !pathExists(root, example.test) || !nonEmpty(example.testCommand)
  })
  const undeclaredExamples = [...exampleFences.keys()].filter(id => !surface.examples.some(example => example.id === id))
  rules.push(result(
    'example-verification',
    invalidExamples.length === 0 && undeclaredExamples.length === 0 ? 'pass' : 'fail',
    invalidExamples.length === 0 && undeclaredExamples.length === 0 ? `${exampleFences.size} primary example(s) are byte-synchronized with executable fixtures.` : `Invalid examples: ${invalidExamples.map(item => item.id).join(', ') || 'none'}; undeclared: ${undeclaredExamples.join(', ') || 'none'}.`,
    [surface.path, ...surface.examples.flatMap(example => [example.fixture, example.test])],
    'Copy the executable fixture exactly into its marked README fence and keep its test evidence.',
  ))

  let actualHash = 'unavailable'
  let hashMatches = false
  try {
    actualHash = computeReadmeSourceHash(root, surface.freshness.sources)
    hashMatches = actualHash === surface.freshness.sourceHash
  } catch {
    hashMatches = false
  }
  const cadenceMs = profile.budgets.freshness.reviewCadenceDays * 86_400_000
  const cadenceSpan = dateValue(surface.freshness.reviewDueOn) - dateValue(surface.freshness.reviewedOn)
  const cadenceMatches = cadenceSpan >= 0 && cadenceSpan <= cadenceMs
  const notOverdue = dateValue(today) <= dateValue(surface.freshness.reviewDueOn)
  rules.push(result(
    'freshness',
    hashMatches && cadenceMatches && notOverdue ? 'pass' : 'fail',
    `sourceHash ${hashMatches ? 'matches' : 'drifted'}; review due ${surface.freshness.reviewDueOn}${notOverdue ? '' : ' (overdue)'}.`,
    [surface.path, ...surface.freshness.sources, actualHash],
    'Run pnpm readme:standard:refresh after reviewing every changed canonical source.',
  ))

  const withExceptions = rules.map(rule => applyException(rule, surface, today))
  return {
    id: surface.id,
    path: surface.path,
    profileId: surface.profileId,
    status: withExceptions.some(rule => rule.status === 'fail') ? 'fail' : 'pass',
    rules: withExceptions,
  }
}

export function auditReadmeStandard(input, options) {
  const config = parseReadmeStandard(input)
  const today = options.today ?? new Date().toISOString().slice(0, 10)
  if (Number.isNaN(dateValue(today))) throw new Error('Audit date must use YYYY-MM-DD')
  const surfaces = [...config.surfaces]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(surface => auditSurface(config, surface, options.root, today))
  const rules = surfaces.flatMap(surface => surface.rules)
  const summary = {
    surfaces: surfaces.length,
    passed: rules.filter(rule => rule.status === 'pass').length,
    failed: rules.filter(rule => rule.status === 'fail').length,
    excepted: rules.filter(rule => rule.status === 'excepted').length,
  }
  return {
    schemaVersion: 1,
    standardId: config.standardId,
    status: summary.failed === 0 ? 'pass' : 'fail',
    auditDate: today,
    summary,
    surfaces,
  }
}

export function formatReadmeStandardReport(report) {
  const lines = [
    `README Standard v1 — ${report.status.toUpperCase()}`,
    `Surfaces: ${report.summary.surfaces} · passed: ${report.summary.passed} · failed: ${report.summary.failed} · excepted: ${report.summary.excepted}`,
  ]
  for (const surface of report.surfaces) {
    lines.push('', `${surface.id} (${surface.profileId}) — ${surface.status.toUpperCase()}`)
    for (const rule of surface.rules) {
      const symbol = rule.status === 'pass' ? '✓' : rule.status === 'excepted' ? '!' : '✗'
      lines.push(`  ${symbol} ${rule.ruleId}: ${rule.message}`)
      if (rule.status !== 'pass') lines.push(`    Fix: ${rule.remediation}`)
    }
  }
  return `${lines.join('\n')}\n`
}
