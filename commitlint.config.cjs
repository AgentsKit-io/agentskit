/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
module.exports = {
  // Pushed history on the vitest 5 branch cannot be rewritten; skip exactly
  // those three headers (a wip snapshot and two over-long headers).
  ignores: [
    (message) =>
      /^wip\(factory\): changes the agent left uncommitted/.test(message) ||
      /^fix\(memory\): use vi\.doMock for in-test redis mock/.test(message) ||
      /^fix\(deps\): skip better-sqlite3 source build, v13 ships prebuilt/.test(message),
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
