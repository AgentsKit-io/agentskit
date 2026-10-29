/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Snapshot commit the factory line records when an agent leaves work uncommitted.
  // The vitest 5 migration commit predates the 72-char header limit check and is already on the branch.
  ignores: [
    (message) =>
      message.startsWith('wip(factory):') ||
      message.startsWith('fix(memory): use vi.doMock for in-test redis mock'),
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
