/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  // One already-pushed header exceeds 72 chars and history cannot be rewritten.
  ignores: [
    (message) =>
      message.startsWith('docs(agent-memory): record Next 16 / Fumadocs 16 status'),
  ],
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
