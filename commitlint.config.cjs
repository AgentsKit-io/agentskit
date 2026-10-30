/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Two headers already in the #1889 branch history, which cannot be rewritten.
  ignores: [
    (message) => message.startsWith('wip(factory): changes the agent left uncommitted'),
    (message) =>
      message.startsWith('chore(deps): typescript 7 stays scoped to root and apps;'),
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
