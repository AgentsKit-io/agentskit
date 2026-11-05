/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
// Two already-pushed commits of the support-matrix change have headers over
// the limit; history cannot be rewritten, so exactly those headers are skipped.
const LEGACY_LONG_HEADERS = [
  'feat(scripts): generate the support matrix with consumers and 1.0 criteria',
  'feat(packages): tag consumerless packages experimental on npm and in the README',
]

module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => LEGACY_LONG_HEADERS.includes(message.split('\n')[0].trim())],
  rules: {
    'header-max-length': [2, 'always', 72],
    'type-enum': [
      2,
      'always',
      [
        'arch',
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'merge',
        'perf',
        'quality',
        'refactor',
        'release',
        'reliability',
        'revert',
        'security',
        'style',
        'test',
      ],
    ],
  },
}
