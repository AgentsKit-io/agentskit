/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Pushed commit on the #1890 branch (history cannot be rewritten); 76-char header.
  ignores: [(message) => message.startsWith('docs(adr): regenerate doc-bridge index after dropping unrelated')],
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
