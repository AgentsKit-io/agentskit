import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  ALLOWED_CHAT_IMPORT_SPECS,
  EXACT_CHAT_VERSION,
  LEGACY_CHAT_PACKAGES,
  LOW_LEVEL_BINDING_EXAMPLE_PREFIXES,
  auditPackageJson,
  auditProductChatAdoption,
  auditSourceFile,
  extractImportSpecs,
  isLowLevelBindingExample,
} from './lib/product-chat-adoption.mjs'

test('classifies docs/registry widgets as product surfaces and examples as low-level bindings', () => {
  assert.equal(isLowLevelBindingExample('apps/docs-next/components/examples/BasicChat.tsx'), true)
  assert.equal(isLowLevelBindingExample('apps/example-react/src/App.tsx'), true)
  assert.equal(isLowLevelBindingExample('apps/docs-next/components/docs/ask-widget.tsx'), false)
  assert.equal(isLowLevelBindingExample('apps/registry/components/ask-widget.tsx'), false)
  assert.ok(LOW_LEVEL_BINDING_EXAMPLE_PREFIXES.length >= 2)
})

test('positive: product package.json with exact chat pin is accepted', () => {
  const violations = auditPackageJson(
    { dependencies: { '@agentskit/chat': EXACT_CHAT_VERSION, '@agentskit/core': 'workspace:*' } },
    'apps/docs-next/package.json',
  )
  assert.deepEqual(violations, [])
})

test('negative: caret pin is rejected', () => {
  const violations = auditPackageJson(
    { dependencies: { '@agentskit/chat': `^${EXACT_CHAT_VERSION}` } },
    'apps/registry/package.json',
  )
  assert.ok(violations.some((v) => v.includes('exact')))
})

test('negative: legacy chat-protocol dependency is rejected', () => {
  const violations = auditPackageJson(
    {
      dependencies: {
        '@agentskit/chat': EXACT_CHAT_VERSION,
        '@agentskit/chat-protocol': '0.2.0',
      },
    },
    'apps/docs-next/package.json',
  )
  assert.ok(violations.some((v) => v.includes(LEGACY_CHAT_PACKAGES[0])))
})

test('negative: legacy chat-react dependency is rejected', () => {
  const violations = auditPackageJson(
    {
      dependencies: {
        '@agentskit/chat': EXACT_CHAT_VERSION,
        '@agentskit/chat-react': '0.2.0',
      },
    },
    'apps/registry/package.json',
  )
  assert.ok(violations.some((v) => v.includes(LEGACY_CHAT_PACKAGES[1])))
})

test('positive: consolidated subpath imports are allowed', () => {
  const source = `
    import { defineChat } from '@agentskit/chat'
    import { AgentChat } from '@agentskit/chat/react'
    import { LocalKnowledgeArtifactSchema } from '@agentskit/chat/protocol'
    import { ChatContainer } from '@agentskit/react'
  `
  assert.deepEqual(auditSourceFile(source, 'apps/docs-next/components/docs/ask-widget.tsx'), [])
  assert.deepEqual(
    extractImportSpecs(source).filter((spec) => ALLOWED_CHAT_IMPORT_SPECS.includes(spec)).sort(),
    [...ALLOWED_CHAT_IMPORT_SPECS].sort(),
  )
})

test('negative: product source importing legacy package fails', () => {
  const source = `import { AgentChat } from '@agentskit/chat-react'\n`
  const violations = auditSourceFile(source, 'apps/registry/components/ask-widget.tsx')
  assert.ok(violations.some((v) => v.includes('@agentskit/chat-react')))
})

test('negative: unsupported chat subpath fails on product surfaces', () => {
  const source = `import { x } from '@agentskit/chat/vue'\n`
  const violations = auditSourceFile(source, 'apps/docs-next/components/docs/ask-widget.tsx')
  assert.ok(violations.some((v) => v.includes('unsupported Chat import')))
})

test('positive: low-level binding examples are not audited as product chat', () => {
  const source = `import { useChat } from '@agentskit/react'\nimport { AgentChat } from '@agentskit/chat-react'\n`
  // Even a legacy string inside a low-level example path is ignored by source audit
  // (examples are not product hosts; they must not drive adoption claims).
  assert.deepEqual(
    auditSourceFile(source, 'apps/docs-next/components/examples/BasicChat.tsx'),
    [],
  )
})

test('repository product surfaces currently pass the live audit', () => {
  const result = auditProductChatAdoption(process.cwd())
  assert.equal(result.ok, true, result.violations.join('\n'))
  assert.ok(result.auditedFiles.some((f) => f.includes('ask-widget')))
  assert.ok(result.auditedFiles.every((f) => !isLowLevelBindingExample(f)))
})

test('fixture root with legacy dep fails end-to-end audit', () => {
  const files = new Map([
    [
      'apps/docs-next/package.json',
      JSON.stringify({
        dependencies: {
          '@agentskit/chat': EXACT_CHAT_VERSION,
          '@agentskit/chat-protocol': '0.2.0',
        },
      }),
    ],
    [
      'apps/registry/package.json',
      JSON.stringify({ dependencies: { '@agentskit/chat': EXACT_CHAT_VERSION } }),
    ],
    [
      'apps/docs-next/components/docs/ask-widget.tsx',
      "import { defineChat } from '@agentskit/chat'\n",
    ],
    [
      'apps/registry/components/ask-widget.tsx',
      "import { defineChat } from '@agentskit/chat'\n",
    ],
  ])

  const result = auditProductChatAdoption('/virtual-root', {
    readFile: (path) => {
      const key = path.replace(/\\/g, '/').split('/virtual-root/').pop()
      if (!files.has(key)) throw new Error(`missing ${key}`)
      return files.get(key)
    },
    walk: (dir) => {
      const posix = dir.replace(/\\/g, '/')
      if (posix.endsWith('apps/docs-next/components/docs')) {
        return ['/virtual-root/apps/docs-next/components/docs/ask-widget.tsx']
      }
      if (posix.endsWith('apps/registry/components')) {
        return ['/virtual-root/apps/registry/components/ask-widget.tsx']
      }
      return []
    },
  })

  assert.equal(result.ok, false)
  assert.ok(result.violations.some((v) => v.includes('@agentskit/chat-protocol')))
})
