/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  // History cannot be rewritten: skip the one over-long renovate header.
  ignores: [(message) => message.startsWith('ci(renovate): group weekly, automerge minor/patch')],
  extends: ['@commitlint/config-conventional'],
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
