/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Historical headers already on this branch (history cannot be rewritten).
  ignores: [
    (m) => m.startsWith('ci(renovate): group weekly, automerge minor/patch'),
    (m) => m.startsWith('fix(renovate): split dev automerge group'),
    (m) => m.startsWith('Reapply "') || m.startsWith('Revert "'),
  ],
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
