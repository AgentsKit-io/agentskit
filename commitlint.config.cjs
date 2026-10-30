/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Station-generated snapshot commits of uncommitted agent work.
  ignores: [
    (message) => message.startsWith('wip(factory):'),
    // Pre-merge header of #1889 that exceeds 72 chars; history is not rewritten.
    (message) => message.startsWith('chore(deps): typescript 7 stays scoped to root and apps;'),
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
