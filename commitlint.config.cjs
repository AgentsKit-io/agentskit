/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // One already-pushed commit carries an over-long fixture note and history
  // cannot be rewritten; ignore exactly that commit, nothing else.
  ignores: [
    (message) =>
      message.startsWith('fix(angular): publish type declarations in package exports\n') &&
      message.includes('Fixture alterada: packages/angular/tests/packed-consumer.test.ts'),
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
