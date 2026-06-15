import { createTestConfig } from '../../vitest.shared'
import { defineConfig } from 'vitest/config'

// @agentskit/angular — lines threshold: 70 (beta floor). Components are tested
// via TestBed (JIT) in a happy-dom env; tests/setup.ts boots the Angular
// testing environment + zone.js.
export default defineConfig(
  createTestConfig({ linesThreshold: 70, environment: 'happy-dom', setupFiles: ['tests/setup.ts'] }),
)
