// Compile-time contract for the CLI protocol/capability boundary.
// Checked by `pnpm lint` in this package (tsc --noEmit over tests/*.test-d.ts).
import { getCliProviderManifest, resolveCliManifest, type CliProviderManifest, type CliProviderManifestFor } from '../src/cli'

const text = getCliProviderManifest('claude-code')!
const json = getCliProviderManifest('claude-code-json')!
const unknownId = getCliProviderManifest('something-else' as string)

// Built-in ids resolve to protocol-specific manifest types.
const textProtocol: 'exec-text' = text.protocol
const jsonProtocol: 'exec-json' = json.protocol
const unionProtocol: CliProviderManifest['protocol'] | undefined = unknownId?.protocol

// Capabilities a protocol can deliver are accepted...
resolveCliManifest(text, { requiredCapabilities: { streaming: true, nativeAuth: true } })
resolveCliManifest(json, { requiredCapabilities: { structuredOutput: true, reasoning: true } })

// ...and capabilities it cannot are compile-time errors.
// @ts-expect-error exec-text cannot deliver structured output
resolveCliManifest(text, { requiredCapabilities: { structuredOutput: true } })
// @ts-expect-error exec-text cannot deliver tool calls
resolveCliManifest(text, { requiredCapabilities: { tools: true } })
// @ts-expect-error exec-json is one response per process, never streamed
resolveCliManifest(json, { requiredCapabilities: { streaming: true } })

// A manifest literal cannot over-claim either.
const overclaiming: CliProviderManifestFor<'exec-text'> = {
  id: 'x', name: 'x', command: 'x', args: [], diagnosticArgs: [], supportedModes: ['review-safe'],
  protocol: 'exec-text',
  // @ts-expect-error structuredOutput is not an exec-text capability
  capabilities: { streaming: true, structuredOutput: true },
}
const overclaimingUnion: CliProviderManifest = {
  id: 'x', name: 'x', command: 'x', args: [], diagnosticArgs: [], supportedModes: ['review-safe'],
  protocol: 'exec-text',
  // @ts-expect-error discriminated by protocol: structuredOutput is rejected for exec-text
  capabilities: { streaming: true, structuredOutput: true },
}

export { textProtocol, jsonProtocol, unionProtocol, overclaiming, overclaimingUnion }
