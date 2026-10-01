/**
 * Static patterns that broke Windows (or another runtime) in the AgentsKit
 * ecosystem. Each one maps to the @agentskit/cross-platform API to use.
 * Regexes run per line, so they stay simple and predictable.
 */
export interface PortabilityRule {
  id: string
  pattern: RegExp
  message: string
  fix: string
}

export const PORTABILITY_RULES: readonly PortabilityRule[] = [
  {
    id: 'child-process-import',
    // Type-only imports (`import type …`, `import('node:child_process').ChildProcess`) are fine.
    pattern:
      /^(?!\s*(?:import|export)\s+type\b).*(?:from\s+|import\s+|require\(\s*|import\(\s*)['"](?:node:)?child_process['"](?!\s*\)\s*\.[A-Z])/,
    message: 'Direct child_process use breaks .cmd shims, long/multi-line args and process-tree kill on Windows',
    fix: 'spawnProcess() / runCommand() / spawnNodeChild() from @agentskit/cross-platform',
  },
  {
    id: 'cross-spawn-import',
    pattern: /(?:from\s+|import\s+|require\(\s*|import\(\s*)['"]cross-spawn['"]/,
    message: 'cross-spawn is centralised in @agentskit/cross-platform',
    fix: 'spawnProcess() / runCommand() from @agentskit/cross-platform',
  },
  {
    id: 'url-pathname',
    pattern: /new\s+URL\([^)]*\)\.pathname/,
    message: 'URL.pathname yields "/C:/…" on Windows, which is not a path',
    fix: 'fileUrlToPath() / moduleDir() from @agentskit/cross-platform',
  },
  {
    id: 'platform-shell',
    pattern: /shell\s*:\s*(?:true\b|process\.platform|isWin)/,
    message: 'shell: true re-parses arguments through cmd.exe or sh (quoting bugs, injection, newline truncation)',
    fix: 'spawnProcess() resolves .cmd shims without a shell',
  },
  {
    id: 'split-newline',
    pattern: /\.split\(\s*(['"`])\\n\1\s*\)/,
    message: "split('\\n') leaves a trailing \\r on every line of CRLF text",
    fix: 'splitLines() / normalizeEol() from @agentskit/cross-platform',
  },
  {
    id: 'manual-slash-normalize',
    pattern: /replace(?:All)?\(\s*(?:\/\\\\\/g|(['"])\\\\\1)\s*,\s*(['"])\/\2\s*\)|split\(\s*(?:path\.)?sep\s*\)\.join\(/,
    message: 'Hand-rolled separator normalisation (one of many copies in the ecosystem)',
    fix: 'toPosix() / relativePosix() from @agentskit/cross-platform',
  },
  {
    id: 'hardcoded-tmp',
    pattern: /(['"`])\/tmp(?:\/|\1)/,
    message: '/tmp does not exist on Windows',
    fix: 'tempDir() from @agentskit/cross-platform',
  },
  {
    id: 'home-env',
    pattern: /process\.env(?:\.HOME\b|\[\s*['"]HOME['"]\s*\])/,
    message: 'HOME is not set on Windows (USERPROFILE is)',
    fix: 'homeDir() from @agentskit/cross-platform',
  },
  {
    id: 'process-group-kill',
    pattern: /process\.kill\(\s*-/,
    message: 'Negative-pid group kill does not exist on Windows',
    fix: 'ChildHandle.kill() / killProcessTree() from @agentskit/cross-platform',
  },
]

/** Put `cross-platform-ignore: <reason>` on the line, or the line above, to skip every rule. `<rule-id>-ignore: <reason>` skips only that rule. */
export const IGNORE_DIRECTIVE = /cross-platform-ignore:\s*\S/
