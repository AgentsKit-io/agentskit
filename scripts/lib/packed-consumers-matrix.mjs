/**
 * Explicit runtime / typecheck expectations for packed-consumer validation.
 *
 * Modes are normally derived from each packed export map. This table only
 * documents named exceptions where Node cannot (or must not) exercise the
 * published surface the same way a real framework/bundler consumer would.
 *
 * Complementary package-owned tests remain authoritative for Metro/Vite/AOT:
 * - packages/eval/tests/bundler-interop.*
 * - packages/rag/tests/metro-bundle.*
 * - packages/angular/tests/package-aot.test.ts
 */

/**
 * @typedef {'esm' | 'cjs' | 'css-file' | 'structural' | 'angular-apf' | 'types'} ValidationMode
 *
 * @typedef {object} PackedConsumerException
 * @property {string} id Stable exception id (appears in diagnostics).
 * @property {string} packageName e.g. @agentskit/react
 * @property {string} subpath Export subpath (`.` or `./theme`).
 * @property {string} reason Human-readable justification.
 * @property {ValidationMode[]} [modes] Override modes for this subpath.
 * @property {boolean} [skipEsm] Do not perform ESM import.
 * @property {boolean} [skipCjs] Do not perform CJS require.
 * @property {boolean} [skipTypecheck] Omit from consumer TS fixtures.
 * @property {boolean} [optionalPeer] Optional peer-backed surface.
 */

/** @type {readonly PackedConsumerException[]} */
export const PACKED_CONSUMER_EXCEPTIONS = Object.freeze([
  {
    id: 'react-theme-css',
    packageName: '@agentskit/react',
    subpath: './theme',
    modes: ['css-file'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    reason: 'CSS-only theme export; file existence only (no runtime import).',
  },
  {
    id: 'angular-apf-only',
    packageName: '@agentskit/angular',
    subpath: '.',
    modes: ['angular-apf', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    reason:
      'Angular APF package: artifact/types checks only. No generic Node runtime import and no CJS expectation.',
  },
  {
    id: 'svelte-esm-only',
    packageName: '@agentskit/svelte',
    subpath: '.',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    reason:
      'Svelte package publishes ESM (+ svelte condition) only — no CJS field. Root re-exports .svelte components, so plain Node cannot runtime-import; structural targets only. Package-owned SSR tests remain authoritative.',
  },
  {
    id: 'react-native-structural',
    packageName: '@agentskit/react-native',
    subpath: '.',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    reason:
      'React Native package requires an RN host environment for real runtime import; structural packed targets only.',
  },
  {
    id: 'solid-client-runtime',
    packageName: '@agentskit/solid',
    subpath: '.',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    reason:
      'Solid components require a client renderer; packed targets and consumer types are checked here, while package-owned DOM tests cover runtime behavior.',
  },
  {
    id: 'observability-langfuse-optional-peer',
    packageName: '@agentskit/observability',
    subpath: './langfuse',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    optionalPeer: true,
    reason:
      'Optional peer `langfuse`. Root `@agentskit/observability` is still runtime-imported; this subpath is structural here.',
  },
  {
    id: 'eval-braintrust-optional-peer',
    packageName: '@agentskit/eval',
    subpath: './braintrust',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    optionalPeer: true,
    reason: 'Optional peer `braintrust`. Root and non-braintrust eval subpaths remain runtime-checked.',
  },
  {
    id: 'eval-braintrust-scorers-optional-peer',
    packageName: '@agentskit/eval',
    subpath: './braintrust/scorers',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    optionalPeer: true,
    reason: 'Optional peer `braintrust` (scorers subpath).',
  },
  {
    id: 'eval-braintrust-ci-optional-peer',
    packageName: '@agentskit/eval',
    subpath: './braintrust/ci',
    modes: ['structural', 'types'],
    skipEsm: true,
    skipCjs: true,
    skipTypecheck: true,
    optionalPeer: true,
    reason: 'Optional peer `braintrust` (ci subpath).',
  },
])

/** Framework packages whose typed surfaces are grouped/exempt in consumer tsc fixtures. */
export const TYPECHECK_EXEMPT_PACKAGES = Object.freeze(
  new Set([
    '@agentskit/angular',
    '@agentskit/svelte',
    '@agentskit/react-native',
  ]),
)

/**
 * Export conditions that are structural in this harness (existence only).
 * Package-owned Metro/Vite tests cover actual browser/RN resolution.
 */
export const STRUCTURAL_EXPORT_CONDITIONS = Object.freeze(['browser', 'react-native'])

/**
 * npm automatic metadata files permitted at the package root of a tarball.
 * Everything else must live under dist/.
 */
export const ALLOWED_PACK_ROOT_FILES = Object.freeze(
  new Set([
    'package.json',
    'readme',
    'readme.md',
    'readme.txt',
    'license',
    'license.md',
    'license.txt',
    'licence',
    'licence.md',
    'licence.txt',
    'changelog',
    'changelog.md',
    'changelog.txt',
    'history',
    'history.md',
    'notice',
    'notice.md',
    'notice.txt',
    'copying',
    'copying.md',
    'copyright',
    'authors',
    'contributors',
  ]),
)

/**
 * @param {string} packageName
 * @param {string} subpath
 * @returns {PackedConsumerException | undefined}
 */
export function findException(packageName, subpath) {
  const normalized = normalizeSubpath(subpath)
  return PACKED_CONSUMER_EXCEPTIONS.find(
    (item) => item.packageName === packageName && normalizeSubpath(item.subpath) === normalized,
  )
}

/**
 * @param {string} subpath
 * @returns {string}
 */
export function normalizeSubpath(subpath) {
  if (subpath === '.' || subpath === '' || subpath === './') return '.'
  if (subpath.startsWith('./')) return subpath
  if (subpath.startsWith('/')) return `.${subpath}`
  return `./${subpath}`
}

/**
 * Build the import specifier for a package + export subpath.
 * @param {string} packageName
 * @param {string} subpath
 */
export function toImportSpecifier(packageName, subpath) {
  const normalized = normalizeSubpath(subpath)
  if (normalized === '.') return packageName
  return `${packageName}${normalized.slice(1)}`
}
