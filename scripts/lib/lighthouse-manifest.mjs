import { readFileSync } from 'node:fs'

function safeOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return 'invalid-origin'
  }
}

export function validateLighthouseManifest(manifestInput, expectedUrl, read = readFileSync) {
  const expectedOrigin = safeOrigin(expectedUrl)
  if (expectedOrigin === 'invalid-origin') throw new Error('Expected Lighthouse origin is invalid.')

  const manifest = typeof manifestInput === 'string' ? JSON.parse(manifestInput) : manifestInput
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('Lighthouse manifest is empty.')

  const actualOrigins = [...new Set(manifest.map((entry) => {
    if (!entry || typeof entry.jsonPath !== 'string') return 'invalid-origin'
    try {
      const report = JSON.parse(read(entry.jsonPath, 'utf8'))
      return safeOrigin(report.finalUrl)
    } catch {
      return 'invalid-origin'
    }
  }))].sort()

  return {
    expectedOrigin,
    actualOrigins,
    valid: actualOrigins.length === 1 && actualOrigins[0] === expectedOrigin,
  }
}
