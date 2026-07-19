import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  EVIDENCE_AXIS_KEYS,
  EVIDENCE_EXEMPT,
  PROMOTION_RFC_EXEMPT,
  auditPromotionRfcs,
  auditStabilityEvidence,
  auditStableDependencies,
  buildStabilityReadinessScorecard,
  collectInternalAgentskitDeps,
  evaluatePromotionRfc,
  evaluateStabilityReadinessRow,
  extractRfcStatus,
  formatStabilityReadinessMarkdown,
  hasExactPackageMetadata,
  isDedicatedStableRfcFilename,
  isSafeRepoRelativePath,
  isUtcCalendarDate,
  validateStabilityEvidence,
} from './lib/stability-gates.mjs'

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

test('dedicated stable RFC filename matches NNNN-<dir>-stable.md exactly', () => {
  assert.equal(isDedicatedStableRfcFilename('0012-react-stable.md', 'react'), true)
  assert.equal(isDedicatedStableRfcFilename('0001-react-native-stable.md', 'react-native'), true)
  assert.equal(isDedicatedStableRfcFilename('0004-framework-binding-stability.md', 'react'), false)
  assert.equal(isDedicatedStableRfcFilename('0012-react-stable.md', 'vue'), false)
  assert.equal(isDedicatedStableRfcFilename('12-react-stable.md', 'react'), false)
  assert.equal(isDedicatedStableRfcFilename('0012-react-stable.txt', 'react'), false)
})

test('package metadata accepts backticks or bare name; rejects loose mentions', () => {
  assert.equal(
    hasExactPackageMetadata('- **Package**: `@agentskit/react`\n', '@agentskit/react'),
    true,
  )
  assert.equal(
    hasExactPackageMetadata('- **Package**: @agentskit/react\n', '@agentskit/react'),
    true,
  )
  assert.equal(
    hasExactPackageMetadata('This RFC covers `@agentskit/react` among others.\n', '@agentskit/react'),
    false,
  )
  assert.equal(
    hasExactPackageMetadata('- **Package**: `@agentskit/vue`\n', '@agentskit/react'),
    false,
  )
})

test('status extractor requires exact Accepted metadata line', () => {
  assert.equal(extractRfcStatus('- **Status**: Accepted\n'), 'Accepted')
  assert.equal(extractRfcStatus('- **Status**: Proposed\n'), 'Proposed')
  assert.equal(extractRfcStatus('Status: Accepted\n'), null)
})

// ---------------------------------------------------------------------------
// Gate 1 — promotion RFC
// ---------------------------------------------------------------------------

const baseStablePkg = {
  name: '@agentskit/react',
  dir: 'react',
  stability: 'stable',
}

function acceptedRfc(overrides = {}) {
  return {
    file: '0012-react-stable.md',
    text: [
      '# RFC 0012 — react stable',
      '',
      '- **Status**: Accepted',
      '- **Package**: `@agentskit/react`',
      '',
      'Commits the public surface.',
      '',
    ].join('\n'),
    ...overrides,
  }
}

test('promotion: general RFC that merely mentions the package is rejected', () => {
  const errors = auditPromotionRfcs({
    packages: [baseStablePkg],
    rfcs: [
      {
        file: '0004-framework-binding-stability.md',
        text: [
          '# RFC 0004 — Framework binding stability',
          '',
          '- **Status**: Accepted',
          '',
          'Covers `@agentskit/react` among other bindings.',
          '',
        ].join('\n'),
      },
    ],
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /no dedicated promotion RFC/)
  assert.match(errors[0], /merely mentions/)
})

test('promotion: dedicated Proposed RFC is rejected', () => {
  const errors = auditPromotionRfcs({
    packages: [baseStablePkg],
    rfcs: [
      acceptedRfc({
        text: [
          '# RFC 0012 — react stable',
          '',
          '- **Status**: Proposed',
          '- **Package**: `@agentskit/react`',
          '',
        ].join('\n'),
      }),
    ],
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /Accepted/)
  assert.match(errors[0], /Proposed/)
})

test('promotion: dedicated Accepted RFC with exact package metadata is accepted', () => {
  const errors = auditPromotionRfcs({
    packages: [baseStablePkg],
    rfcs: [acceptedRfc()],
  })
  assert.deepEqual(errors, [])
})

test('promotion: dedicated Accepted RFC without backticks on Package is accepted', () => {
  const errors = auditPromotionRfcs({
    packages: [baseStablePkg],
    rfcs: [
      acceptedRfc({
        text: [
          '# RFC 0012',
          '',
          '- **Status**: Accepted',
          '- **Package**: @agentskit/react',
          '',
        ].join('\n'),
      }),
    ],
  })
  assert.deepEqual(errors, [])
})

test('promotion: package metadata mismatch is rejected', () => {
  const errors = auditPromotionRfcs({
    packages: [baseStablePkg],
    rfcs: [
      acceptedRfc({
        text: [
          '# RFC 0012',
          '',
          '- **Status**: Accepted',
          '- **Package**: `@agentskit/vue`',
          '',
        ].join('\n'),
      }),
    ],
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /package metadata/)
})

test('promotion: core exemption is the only free pass; beta packages are ignored', () => {
  const errors = auditPromotionRfcs({
    packages: [
      { name: '@agentskit/core', dir: 'core', stability: 'stable' },
      { name: '@agentskit/vue', dir: 'vue', stability: 'beta' },
    ],
    rfcs: [],
    exempt: PROMOTION_RFC_EXEMPT,
  })
  assert.deepEqual(errors, [])
  assert.equal(PROMOTION_RFC_EXEMPT.size, 1)
  assert.ok(PROMOTION_RFC_EXEMPT.has('@agentskit/core'))
})

test('evaluatePromotionRfc returns actionable reasons per failure mode', () => {
  const wrongName = evaluatePromotionRfc({
    fileName: '0004-framework-binding-stability.md',
    text: '- **Status**: Accepted\n- **Package**: `@agentskit/react`\n',
    packageDir: 'react',
    packageName: '@agentskit/react',
  })
  assert.equal(wrongName.ok, false)
  assert.match(wrongName.reason, /NNNN-react-stable\.md/)

  const proposed = evaluatePromotionRfc({
    fileName: '0012-react-stable.md',
    text: '- **Status**: Proposed\n- **Package**: `@agentskit/react`\n',
    packageDir: 'react',
    packageName: '@agentskit/react',
  })
  assert.equal(proposed.ok, false)
  assert.match(proposed.reason, /Proposed/)
})

// ---------------------------------------------------------------------------
// Gate 2 — stable internal dependencies
// ---------------------------------------------------------------------------

test('collectInternalAgentskitDeps ignores devDependencies and non-agentskit', () => {
  const deps = collectInternalAgentskitDeps({
    dependencies: { '@agentskit/core': 'workspace:*', 'ajv': '^8' },
    peerDependencies: { vue: '^3' },
    optionalDependencies: { '@agentskit/tools': 'workspace:*' },
    devDependencies: { '@agentskit/adapters': 'workspace:*' },
  })
  assert.deepEqual([...deps].sort(), ['@agentskit/core', '@agentskit/tools'])
})

test('stable → alpha/beta internal dependency is rejected', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/runtime',
        stability: 'stable',
        dependencies: { '@agentskit/core': 'workspace:*', '@agentskit/tools': 'workspace:*' },
      },
      { name: '@agentskit/core', stability: 'stable', dependencies: {} },
      { name: '@agentskit/tools', stability: 'beta', dependencies: { '@agentskit/core': 'workspace:*' } },
    ],
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /@agentskit\/runtime/)
  assert.match(errors[0], /@agentskit\/tools/)
  assert.match(errors[0], /beta/)
})

test('stable → stable internal dependency is accepted', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/runtime',
        stability: 'stable',
        dependencies: { '@agentskit/core': 'workspace:*' },
      },
      { name: '@agentskit/core', stability: 'stable', dependencies: {} },
    ],
  })
  assert.deepEqual(errors, [])
})

test('beta → alpha internal dependency is allowed', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/runtime',
        stability: 'beta',
        dependencies: { '@agentskit/integrations': 'workspace:*' },
      },
      { name: '@agentskit/integrations', stability: 'alpha', dependencies: {} },
    ],
  })
  assert.deepEqual(errors, [])
})

test('devDependency on non-stable is ignored', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/runtime',
        stability: 'stable',
        dependencies: { '@agentskit/core': 'workspace:*' },
        devDependencies: { '@agentskit/adapters': 'workspace:*' },
      },
      { name: '@agentskit/core', stability: 'stable', dependencies: {} },
      { name: '@agentskit/adapters', stability: 'beta', dependencies: {} },
    ],
  })
  assert.deepEqual(errors, [])
})

test('external peer dependency is allowed on stable packages', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/react',
        stability: 'stable',
        dependencies: { '@agentskit/core': 'workspace:*' },
        peerDependencies: { react: '^19.0.0' },
      },
      { name: '@agentskit/core', stability: 'stable', dependencies: {} },
    ],
  })
  assert.deepEqual(errors, [])
})

test('stable peerDependency on non-stable internal package is rejected', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/cli',
        stability: 'stable',
        peerDependencies: { '@agentskit/ink': 'workspace:*' },
      },
      { name: '@agentskit/ink', stability: 'beta', dependencies: {} },
    ],
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /@agentskit\/ink/)
})

test('unknown @agentskit runtime dependency fails closed', () => {
  const errors = auditStableDependencies({
    packages: [
      {
        name: '@agentskit/runtime',
        stability: 'stable',
        dependencies: { '@agentskit/not-in-workspace': 'workspace:*' },
      },
    ],
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /unknown internal package/)
})

// ---------------------------------------------------------------------------
// Gate 3 — graduation evidence (ADR 0024)
// ---------------------------------------------------------------------------

const TODAY = '2026-07-16'

function validEvidenceDoc(overrides = {}) {
  return {
    schemaVersion: 1,
    package: '@agentskit/react',
    betaSince: '2026-01-10',
    proposedStableDate: '2026-04-15',
    qualifyingMinorReleases: [
      { version: '0.8.0', date: '2026-02-01' },
      { version: '0.9.0', date: '2026-03-10' },
    ],
    evidence: {
      publicApi: 'docs/evidence/stability/react/public-api.md',
      packageSmoke: 'docs/evidence/stability/react/package-smoke.md',
      completeness: 'docs/evidence/stability/react/completeness.md',
      resilience: 'docs/evidence/stability/react/resilience.md',
      compatibility: 'docs/evidence/stability/react/compatibility.md',
      sustainability: 'docs/evidence/stability/react/sustainability.md',
      breakingChangeAudit: 'docs/evidence/stability/react/breaking-change-audit.md',
    },
    ...overrides,
  }
}

const allPathsExist = () => true

test('isUtcCalendarDate accepts real dates and rejects impossible ones', () => {
  assert.equal(isUtcCalendarDate('2026-01-10'), true)
  assert.equal(isUtcCalendarDate('2026-02-28'), true)
  assert.equal(isUtcCalendarDate('2026-02-30'), false)
  assert.equal(isUtcCalendarDate('2026-13-01'), false)
  assert.equal(isUtcCalendarDate('2026-1-1'), false)
  assert.equal(isUtcCalendarDate('not-a-date'), false)
})

test('evidence: invalid calendar date is rejected', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc({ betaSince: '2026-02-30' }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => /betaSince.*real UTC calendar date/.test(e)))
})

test('evidence: future proposedStableDate is rejected', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc({
      betaSince: '2026-05-01',
      proposedStableDate: '2026-08-01',
      qualifyingMinorReleases: [
        { version: '0.8.0', date: '2026-06-01' },
        { version: '0.9.0', date: '2026-07-01' },
      ],
    }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => /in the future/.test(e)))
})

test('evidence: soak window shorter than 90 days is rejected', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc({
      betaSince: '2026-03-01',
      proposedStableDate: '2026-04-15',
      qualifyingMinorReleases: [
        { version: '0.8.0', date: '2026-03-10' },
        { version: '0.9.0', date: '2026-04-01' },
      ],
    }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => /at least 90 full calendar days/.test(e)))
})

test('evidence: two patches on the same minor line are rejected', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc({
      qualifyingMinorReleases: [
        { version: '0.8.0', date: '2026-02-01' },
        { version: '0.8.1', date: '2026-03-10' },
      ],
    }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => /two distinct major\.minor/.test(e)))
})

test('evidence: two distinct minor lines are accepted', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc(),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, true)
})

test('evidence: release date outside beta window is rejected', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc({
      qualifyingMinorReleases: [
        { version: '0.8.0', date: '2025-12-01' },
        { version: '0.9.0', date: '2026-03-10' },
      ],
    }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => /within betaSince\.\.proposedStableDate/.test(e)))
})

test('evidence: missing / unsafe / nonexistent paths are rejected', () => {
  const missingKey = validateStabilityEvidence({
    doc: validEvidenceDoc({
      evidence: {
        publicApi: 'docs/evidence/stability/react/public-api.md',
        packageSmoke: 'docs/evidence/stability/react/package-smoke.md',
        completeness: 'docs/evidence/stability/react/completeness.md',
        resilience: 'docs/evidence/stability/react/resilience.md',
        compatibility: 'docs/evidence/stability/react/compatibility.md',
        sustainability: 'docs/evidence/stability/react/sustainability.md',
        // breakingChangeAudit intentionally missing
      },
    }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(missingKey.ok, false)
  assert.ok(missingKey.errors.some((e) => /breakingChangeAudit/.test(e)))

  const unsafe = validateStabilityEvidence({
    doc: validEvidenceDoc({
      evidence: {
        ...validEvidenceDoc().evidence,
        publicApi: '../secrets/public-api.md',
      },
    }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(unsafe.ok, false)
  assert.ok(unsafe.errors.some((e) => /safe repository-relative path/.test(e)))

  const absolute = validateStabilityEvidence({
    doc: validEvidenceDoc({
      evidence: {
        ...validEvidenceDoc().evidence,
        publicApi: '/etc/passwd',
      },
    }),
    packageName: '@agentskit/react',
    today: TODAY,
  })
  assert.equal(absolute.ok, false)
  assert.ok(absolute.errors.some((e) => /safe repository-relative path/.test(e)))

  const missingFile = validateStabilityEvidence({
    doc: validEvidenceDoc(),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: (p) => p !== 'docs/evidence/stability/react/resilience.md',
  })
  assert.equal(missingFile.ok, false)
  assert.ok(missingFile.errors.some((e) => /does not exist as a file/.test(e)))
})

test('evidence: package name mismatch is rejected', () => {
  const result = validateStabilityEvidence({
    doc: validEvidenceDoc({ package: '@agentskit/vue' }),
    packageName: '@agentskit/react',
    today: TODAY,
    pathExists: allPathsExist,
  })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => /must exactly match package\.json name/.test(e)))
})

test('evidence: core is the sole exemption; beta packages are ignored by the gate', () => {
  assert.equal(EVIDENCE_EXEMPT.size, 1)
  assert.ok(EVIDENCE_EXEMPT.has('@agentskit/core'))
  assert.equal(EVIDENCE_AXIS_KEYS.length, 7)

  const errors = auditStabilityEvidence({
    packages: [
      { name: '@agentskit/core', dir: 'core', stability: 'stable' },
      { name: '@agentskit/vue', dir: 'vue', stability: 'beta' },
    ],
    loadEvidence: () => {
      throw new Error('loadEvidence must not be called for exempt/non-stable packages')
    },
    today: TODAY,
  })
  assert.deepEqual(errors, [])
})

test('evidence: stable non-core without evidence file fails the gate', () => {
  const errors = auditStabilityEvidence({
    packages: [{ name: '@agentskit/react', dir: 'react', stability: 'stable' }],
    loadEvidence: () => ({ kind: 'missing' }),
    today: TODAY,
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /missing graduation evidence file/)
  assert.match(errors[0], /docs\/stability\/react\.json/)
})

test('isSafeRepoRelativePath rejects absolute, parent, and empty-segment paths', () => {
  assert.equal(isSafeRepoRelativePath('docs/evidence/foo.md'), true)
  assert.equal(isSafeRepoRelativePath('/abs'), false)
  assert.equal(isSafeRepoRelativePath('../x'), false)
  assert.equal(isSafeRepoRelativePath('a/../b'), false)
  assert.equal(isSafeRepoRelativePath('a//b'), false)
  assert.equal(isSafeRepoRelativePath(''), false)
})

// ---------------------------------------------------------------------------
// Stability-readiness scorecard
// ---------------------------------------------------------------------------

test('scorecard: core is exempt on promotion/evidence/soak/axes and ready when conventions+deps pass', () => {
  const row = evaluateStabilityReadinessRow({
    pkg: {
      name: '@agentskit/core',
      dir: 'core',
      stability: 'stable',
      dependencies: {},
    },
    packages: [
      { name: '@agentskit/core', dir: 'core', stability: 'stable', dependencies: {} },
    ],
    rfcs: [],
    evidenceMissing: true,
    conventionsPresent: true,
    today: TODAY,
  })
  assert.deepEqual(row, {
    package: '@agentskit/core',
    tier: 'stable',
    conventions: 'yes',
    stableDeps: 'yes',
    promotionRfc: 'exempt',
    evidence: 'exempt',
    soak: 'exempt',
    axes: 'exempt',
    ready: 'yes',
  })
})

test('scorecard: beta package missing graduation work is pending/no, not ready', () => {
  const packages = [
    {
      name: '@agentskit/react',
      dir: 'react',
      stability: 'beta',
      dependencies: { '@agentskit/core': 'workspace:*' },
    },
    { name: '@agentskit/core', dir: 'core', stability: 'stable', dependencies: {} },
  ]
  const row = evaluateStabilityReadinessRow({
    pkg: packages[0],
    packages,
    rfcs: [],
    evidenceMissing: true,
    conventionsPresent: true,
    today: TODAY,
  })
  assert.equal(row.package, '@agentskit/react')
  assert.equal(row.tier, 'beta')
  assert.equal(row.conventions, 'yes')
  assert.equal(row.stableDeps, 'yes')
  assert.equal(row.promotionRfc, 'pending')
  assert.equal(row.evidence, 'pending')
  assert.equal(row.soak, 'pending')
  assert.equal(row.axes, 'pending')
  assert.equal(row.ready, 'no')
})

test('scorecard: fully ready non-core candidate gets ready=yes', () => {
  const packages = [
    {
      name: '@agentskit/react',
      dir: 'react',
      stability: 'beta',
      dependencies: { '@agentskit/core': 'workspace:*' },
    },
    { name: '@agentskit/core', dir: 'core', stability: 'stable', dependencies: {} },
  ]
  const paths = new Set(Object.values(validEvidenceDoc().evidence))
  const row = evaluateStabilityReadinessRow({
    pkg: packages[0],
    packages,
    rfcs: [acceptedRfc()],
    evidenceDoc: validEvidenceDoc(),
    evidenceMissing: false,
    pathExists: (p) => paths.has(p),
    conventionsPresent: true,
    today: TODAY,
  })
  assert.equal(row.promotionRfc, 'yes')
  assert.equal(row.evidence, 'yes')
  assert.equal(row.soak, 'yes')
  assert.equal(row.axes, 'yes')
  assert.equal(row.ready, 'yes')
})

test('scorecard: build + format are deterministic and sorted by package name', () => {
  const packages = [
    { name: '@agentskit/vue', dir: 'vue', stability: 'beta', dependencies: {} },
    { name: '@agentskit/core', dir: 'core', stability: 'stable', dependencies: {} },
    {
      name: '@agentskit/react',
      dir: 'react',
      stability: 'beta',
      dependencies: { '@agentskit/tools': 'workspace:*' },
    },
    { name: '@agentskit/tools', dir: 'tools', stability: 'beta', dependencies: {} },
  ]
  const rows = buildStabilityReadinessScorecard({
    packages,
    rfcs: [],
    loadEvidence: () => ({ kind: 'missing' }),
    pathExists: () => false,
    hasConventions: (pkg) => pkg.dir !== 'vue',
    today: TODAY,
  })
  assert.deepEqual(
    rows.map((r) => r.package),
    ['@agentskit/core', '@agentskit/react', '@agentskit/tools', '@agentskit/vue'],
  )
  assert.equal(rows[0].ready, 'yes')
  assert.equal(rows[1].stableDeps, 'no') // depends on beta tools
  assert.equal(rows[3].conventions, 'no')

  const md = formatStabilityReadinessMarkdown(rows)
  assert.match(md, /^\| Package \| Tier \| Conventions \| Stable deps \| Promotion RFC \| Evidence \| Soak \| Axes \| Ready \|/m)
  assert.ok(md.indexOf('@agentskit/core') < md.indexOf('@agentskit/react'))
  assert.ok(md.indexOf('@agentskit/react') < md.indexOf('@agentskit/vue'))
})
