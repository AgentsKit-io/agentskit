import type { ViteUserConfig } from 'vitest/config'

/**
 * Shared vitest configuration for AgentsKit packages.
 *
 * The `lines` threshold is the gate metric (simplest, most stable signal).
 * Per-package thresholds are set at "current minus small buffer" to prevent
 * silent regressions while not blocking PRs on aspirational targets.
 *
 * Aspirational target for the next 2 sprints: every package ≥ 80% lines.
 * Sacred target (Manifesto principle 1): @agentskit/core ≥ 90% lines.
 *
 * To raise a threshold: write the tests, raise the number in the package's
 * vitest.config.ts, ship the PR. CI will hold the new line.
 *
 * `criticalFiles` allows individual files (security-sensitive paths) to
 * carry a tighter gate than the package-level default. Each entry is a
 * vitest threshold-glob — see
 * https://vitest.dev/config/#coverage-thresholds for the syntax.
 */
export interface PackageTestConfig {
  /** Lines coverage threshold (percentage 0-100). Default: 60. */
  linesThreshold?: number
  /** Test environment. Default: 'node'. React packages should use 'happy-dom'. */
  environment?: 'node' | 'jsdom' | 'happy-dom'
  /** Setup files to run before tests (relative to package root). */
  setupFiles?: string[]
  /**
   * Files that must be held to a higher coverage bar than the package
   * default. Map of glob → required lines%. Use for security-critical
   * surfaces (shell, filesystem, fetch-url, vault, sandbox, mcp client).
   */
  criticalFiles?: Record<string, number>
}

export function createTestConfig(opts: PackageTestConfig = {}): ViteUserConfig {
  const baseThresholds: Record<string, unknown> = {
    lines: opts.linesThreshold ?? 90,
  }
  if (opts.criticalFiles) {
    for (const [pattern, lines] of Object.entries(opts.criticalFiles)) {
      baseThresholds[pattern] = { lines }
    }
  }

  return {
    test: {
      environment: opts.environment ?? 'node',
      globals: true,
      passWithNoTests: true,
      setupFiles: opts.setupFiles,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov', 'json-summary'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/*.d.ts',
          'src/**/index.ts',
          'src/**/__tests__/**',
        ],
        thresholds: baseThresholds,
      },
    },
  }
}
