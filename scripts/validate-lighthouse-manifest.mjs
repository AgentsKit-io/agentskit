import { validateLighthouseManifest } from './lib/lighthouse-manifest.mjs'

try {
  const result = validateLighthouseManifest(process.env.LH_MANIFEST, process.env.EXPECTED_ORIGIN)
  if (!result.valid) {
    console.error(`::error::Lighthouse audited unexpected origin(s): ${result.actualOrigins.join(', ')}; expected ${result.expectedOrigin}.`)
    process.exitCode = 1
  } else {
    console.log(`Lighthouse destination verified: ${result.expectedOrigin}`)
  }
} catch (error) {
  console.error(`::error::${error instanceof Error ? error.message : 'Lighthouse manifest validation failed.'}`)
  process.exitCode = 1
}
