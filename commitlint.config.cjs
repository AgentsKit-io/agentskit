/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Factory-line bot commits wrap a conventional message in a `factory: ` prefix.
  // One already-pushed commit on this branch has an 80-char header; history is not rewritten.
  ignores: [
    (message) => message.startsWith('fix(ci): wire release-train gates into quality gates, pin actions,'),
    (message) => /^factory: (feat|fix|chore|ci|docs|refactor|test|build|perf)(\([^)]*\))?!?: /.test(message),
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
