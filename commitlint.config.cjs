/**
 * Keep commit messages machine-readable without rejecting the repository's
 * established type vocabulary (including release, security, and quality work).
 */
const UNREWRITABLE_HEADERS = new Set([
  'wip(factory): changes the agent left uncommitted',
  'fix(memory): use vi.doMock for in-test redis mock (vitest 5 hoisting check)',
  'fix(deps): skip better-sqlite3 source build, v13 ships prebuilt binaries',
])

module.exports = {
  // Exact headers of pushed vitest 5 branch commits that cannot be reworded;
  // the squash merge replaces them with the PR title.
  ignores: [(message) => UNREWRITABLE_HEADERS.has(message.split('\n')[0].trim())],
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
