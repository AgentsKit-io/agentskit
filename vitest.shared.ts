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
 */
export interface PackageTestConfig {
  /** Lines coverage threshold (percentage 0-100). Default: 60. */
  linesThreshold?: number
  /** Test environment. Default: 'node'. React packages should use 'happy-dom'. */
  environment?: 'node' | 'jsdom' | 'happy-dom'
  /** Setup files to run before tests (relative to package root). */
  setupFiles?: string[]
}

export function createTestConfig(opts: PackageTestConfig = {}): ViteUserConfig {
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
        thresholds: {
          lines: opts.linesThreshold ?? 60,
        },
      },
    },
  }
}
