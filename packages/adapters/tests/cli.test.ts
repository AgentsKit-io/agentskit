import { describe, expect, it } from 'vitest'
import {
  createAcpCliAdapter,
  createCliAdapter,
  createJsonCliAdapter,
  diagnoseCliProvider,
  diagnoseCliProviderManifest,
  getCliProviderManifest,
  listCliProviderManifests,
  manifestCapabilities,
  resolveCliManifest,
  validateCliProviderManifest,
} from '../src/cli'
import type { CliProviderManifest } from '../src/cli'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'

const request: AdapterRequest = {
  messages: [{
    id: 'm1',
    role: 'user',
    content: 'review this',
    status: 'complete',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }],
}

async function collect(adapter: ReturnType<typeof createCliAdapter>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of adapter.createSource(request).stream()) chunks.push(chunk)
  return chunks
}

describe('CLI adapters', () => {
  it('passes argv literally without a shell and emits text plus done', async () => {
    const adapter = createCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdin.on('data',()=>{}); process.stdin.on('end',()=>process.stdout.write(process.argv[1]))", 'literal;not-a-command'],
    })
    await expect(collect(adapter)).resolves.toEqual([
      { type: 'text', content: 'literal;not-a-command' },
      { type: 'done' },
    ])
  })

  it('builds request-aware argv and can close stdin without serializing the request', async () => {
    const adapter = createCliAdapter({
      command: process.execPath,
      buildArgs: requestValue => ['-e', "process.stdout.write(process.argv[1])", requestValue.messages[0]!.content],
      serializeRequest: () => '',
    })
    await expect(collect(adapter)).resolves.toEqual([
      { type: 'text', content: 'review this' },
      { type: 'done' },
    ])
  })

  it('returns a typed error for a non-zero CLI exit', async () => {
    const chunks = await collect(createCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stderr.write('bad'); process.exit(3)"],
    }))
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: expect.stringContaining('code 3') })
  })

  it('parses one structured JSON response and fails closed on malformed JSON', async () => {
    const adapter = createJsonCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write('{\"text\":\"ok\"}'))"],
    })
    await expect(collect(adapter)).resolves.toEqual([
      { type: 'text', content: 'ok' },
      { type: 'done' },
    ])

    const invalid = await collect(createJsonCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write('{broken'))"],
    }))
    expect(invalid).toHaveLength(1)
    expect(invalid[0]).toMatchObject({ type: 'error', content: expect.stringContaining('malformed JSON') })
  })

  it('decodes raw output before applying the structured parser', async () => {
    const adapter = createJsonCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdout.write(JSON.stringify({event: JSON.stringify({text:'ok'})}))"],
      parseOutput: stdout => JSON.parse(stdout).event,
      parse: value => [{ type: 'text', content: value as string }],
    })
    await expect(collect(adapter)).resolves.toEqual([
      { type: 'text', content: '{"text":"ok"}' },
      { type: 'done' },
    ])
  })

  it('terminates a CLI that exceeds its deadline', async () => {
    const chunks = await collect(createCliAdapter({
      command: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      timeoutMs: 50,
    }))
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: expect.stringContaining('timed out') })
  })

  it('runs review-safe with an allowlisted environment and trusted-local with inheritance', async () => {
    const inheritedKey = 'AGENTSKIT_CLI_TEST_INHERITED'
    const previous = process.env[inheritedKey]
    process.env[inheritedKey] = 'inherited'
    try {
      const script = `process.stdout.write(JSON.stringify({inherited:process.env.${inheritedKey} ?? null, home:process.env.HOME ?? null}))`
      const safe = await collect(createCliAdapter({ command: process.execPath, args: ['-e', script] }))
      expect(safe[0]).toMatchObject({ type: 'text', content: JSON.stringify({ inherited: null, home: null }) })

      const trusted = await collect(createCliAdapter({ command: process.execPath, args: ['-e', script], mode: 'trusted-local' }))
      expect(trusted[0]).toMatchObject({ type: 'text', content: JSON.stringify({ inherited: 'inherited', home: process.env.HOME ?? null }) })
    } finally {
      if (previous === undefined) delete process.env[inheritedKey]
      else process.env[inheritedKey] = previous
    }
  })

  it('rejects unsupported capabilities before spawning and redacts diagnostics', async () => {
    const blocked = await collect(createCliAdapter({
      command: 'this-command-must-not-start',
      requiredCapabilities: { mcp: true },
    }))
    expect(blocked[0]).toMatchObject({ type: 'error', content: expect.stringContaining('required capability: mcp') })

    const diagnostics: Array<{ error?: string; success?: boolean }> = []
    const secret = 'super-secret-cli-value'
    const failed = await collect(createCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stderr.write(process.env.CLI_SECRET); process.exit(4)"],
      env: { CLI_SECRET: secret },
      onDiagnostic: diagnostic => diagnostics.push(diagnostic),
    }))
    expect(failed[0]).toMatchObject({ type: 'error' })
    expect(failed[0]?.content).not.toContain(secret)
    expect(diagnostics.at(-1)?.error).not.toContain(secret)
    expect(diagnostics.at(-1)?.success).toBe(false)
  })

  it('returns structured diagnostics from provider discovery', async () => {
    const diagnostic = await diagnoseCliProvider({
      command: process.execPath,
      diagnosticArgs: ['-e', "process.stdout.write('cli-v1')"],
      providerId: 'fixture',
    })
    expect(diagnostic).toMatchObject({ available: true, providerId: 'fixture', protocol: 'exec-text', version: 'cli-v1' })
    expect(diagnostic.elapsedMs).toEqual(expect.any(Number))
  })

  it('exposes validated first-party manifests without auto-discovery', () => {
    const manifests = listCliProviderManifests()
    expect(manifests.map(manifest => manifest.id)).toEqual(['codex', 'claude-code', 'grok', 'opencode'])
    expect(manifests.every(manifest => manifest.supportedModes.includes('review-safe'))).toBe(true)
    expect(getCliProviderManifest('does-not-exist')).toBeUndefined()
    expect(manifestCapabilities(manifests[0]!)).toMatchObject({ streaming: true })
    const mutableArgs = manifests[0]!.args as string[]
    mutableArgs.push('mutated')
    expect(listCliProviderManifests()[0]!.args).not.toContain('mutated')
  })

  it('resolves a manifest into explicit argv and provider diagnostics', async () => {
    const manifest: CliProviderManifest = {
      id: 'fixture',
      name: 'Fixture CLI',
      command: process.execPath,
      args: ['-e', "process.stdout.write('ok')"],
      diagnosticArgs: ['-e', "process.stdout.write('fixture-v1')"],
      protocol: 'exec-text',
      capabilities: { streaming: true },
      supportedModes: ['review-safe'],
      versionPattern: '^fixture-v1$',
    }
    const resolved = resolveCliManifest(manifest)
    expect(resolved).toMatchObject({ command: process.execPath, args: manifest.args, providerId: 'fixture', protocol: 'exec-text' })
    await expect(collect(createCliAdapter(resolved))).resolves.toEqual([{ type: 'text', content: 'ok' }, { type: 'done' }])
    await expect(diagnoseCliProviderManifest(manifest)).resolves.toMatchObject({ available: true, version: 'fixture-v1', providerId: 'fixture' })
  })

  it('rejects a manifest that overclaims protocol capabilities', () => {
    const invalid: CliProviderManifest = {
      id: 'invalid',
      name: 'Invalid CLI',
      command: 'invalid',
      args: [],
      diagnosticArgs: ['--version'],
      protocol: 'exec-text',
      capabilities: { streaming: true, structuredOutput: true },
      supportedModes: ['review-safe'],
    }
    expect(() => validateCliProviderManifest(invalid)).toThrow(/unsupported structuredOutput/)
    expect(() => validateCliProviderManifest(null)).toThrow(/must be an object/)
  })

  it('rejects malformed manifests and reports version drift', async () => {
    const base = {
      id: 'fixture', name: 'Fixture CLI', command: process.execPath,
      args: [], diagnosticArgs: ['-e', "process.stdout.write('fixture-v1')"],
      protocol: 'exec-text', capabilities: { streaming: true }, supportedModes: ['review-safe'],
    } satisfies CliProviderManifest
    expect(() => validateCliProviderManifest({ ...base, args: [1] })).toThrow(/args and diagnosticArgs/)
    expect(() => validateCliProviderManifest({ ...base, id: 7 })).toThrow(/id, name, and command must be strings/)
    expect(() => validateCliProviderManifest({ ...base, protocol: 'unknown' })).toThrow(/protocol is unsupported/)
    expect(() => validateCliProviderManifest({ ...base, supportedModes: ['trusted-local'] })).toThrow(/must support review-safe/)
    expect(() => validateCliProviderManifest({ ...base, credentialEnv: ['BAD-NAME'] })).toThrow(/invalid credential environment/)
    await expect(diagnoseCliProviderManifest({ ...base, versionPattern: '^other-v1$' })).resolves.toMatchObject({
      available: false,
      error: 'CLI version does not match manifest fixture',
    })
    await expect(collect(createCliAdapter({ command: process.execPath, maxOutputBytes: 0 }))).resolves.toMatchObject([
      { type: 'error', content: expect.stringContaining('maxOutputBytes') },
    ])
  })

  it('normalizes ACP v1 session output over JSON lines', async () => {
    const script = `
      const rl = require('node:readline').createInterface({ input: process.stdin });
      rl.on('line', line => {
        const message = JSON.parse(line);
        if (message.method === 'initialize') process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{protocolVersion:1}})+'\\n');
        if (message.method === 'session/new') process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{sessionId:'s1'}})+'\\n');
        if (message.method === 'session/prompt') {
          process.stdout.write(JSON.stringify({jsonrpc:'2.0',method:'session/update',params:{sessionId:'s1',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'ok'}}}})+'\\n');
          process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{stopReason:'end_turn'}})+'\\n');
        }
      });
    `
    await expect(collect(createAcpCliAdapter({ command: process.execPath, args: ['-e', script] }))).resolves.toEqual([
      { type: 'text', content: 'ok' },
      { type: 'done' },
    ])
  })
})
