// ---------------------------------------------------------------------------
// AgentsKit didactic error system — Rust-compiler-style helpful errors
// ---------------------------------------------------------------------------

const DOCS_BASE = 'https://www.agentskit.io/docs'

/**
 * Format an error for display, Rust-compiler style.
 *
 * Example output:
 * ```
 * error[AK_ADAPTER_MISSING]: No adapter provided
 *   --> Hint: Pass an adapter when creating the chat controller, e.g.
 *             createChatController({ adapter: openaiAdapter() })
 *   --> Docs: https://www.agentskit.io/docs/adapters
 * ```
 */
function formatError(code: string, message: string, hint?: string, docsUrl?: string): string {
  const lines: string[] = [`error[${code}]: ${message}`]
  if (hint) lines.push(`  --> Hint: ${hint}`)
  if (docsUrl) lines.push(`  --> Docs: ${docsUrl}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export class AgentsKitError extends Error {
  readonly code: string
  readonly hint: string | undefined
  readonly docsUrl: string | undefined
  readonly cause: unknown

  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super(options.message)
    this.name = 'AgentsKitError'
    this.code = options.code
    this.hint = options.hint
    this.docsUrl = options.docsUrl
    this.cause = options.cause
  }

  override toString(): string {
    return formatError(this.code, this.message, this.hint, this.docsUrl)
  }
}

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------

export class AdapterError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/adapters`, ...options })
    this.name = 'AdapterError'
  }
}

export class ToolError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/tools`, ...options })
    this.name = 'ToolError'
  }
}

export class MemoryError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/memory`, ...options })
    this.name = 'MemoryError'
  }
}

export class ConfigError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/configuration`, ...options })
    this.name = 'ConfigError'
  }
}

export class RuntimeError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/agents/runtime`, ...options })
    this.name = 'RuntimeError'
  }
}

export class SandboxError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/production/security/mandatory-sandbox`, ...options })
    this.name = 'SandboxError'
  }
}

export class SkillError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/agents/skills`, ...options })
    this.name = 'SkillError'
  }
}

// ---------------------------------------------------------------------------
// Error code constants
// ---------------------------------------------------------------------------

export const ErrorCodes = {
  // Adapter errors
  AK_ADAPTER_MISSING: 'AK_ADAPTER_MISSING',
  AK_ADAPTER_STREAM_FAILED: 'AK_ADAPTER_STREAM_FAILED',

  // Tool errors
  AK_TOOL_NOT_FOUND: 'AK_TOOL_NOT_FOUND',
  AK_TOOL_EXEC_FAILED: 'AK_TOOL_EXEC_FAILED',
  AK_TOOL_PEER_MISSING: 'AK_TOOL_PEER_MISSING',
  AK_TOOL_INVALID_INPUT: 'AK_TOOL_INVALID_INPUT',

  // Memory errors
  AK_MEMORY_LOAD_FAILED: 'AK_MEMORY_LOAD_FAILED',
  AK_MEMORY_SAVE_FAILED: 'AK_MEMORY_SAVE_FAILED',
  AK_MEMORY_DESERIALIZE_FAILED: 'AK_MEMORY_DESERIALIZE_FAILED',
  AK_MEMORY_PEER_MISSING: 'AK_MEMORY_PEER_MISSING',
  AK_MEMORY_REMOTE_HTTP: 'AK_MEMORY_REMOTE_HTTP',

  // Config errors
  AK_CONFIG_INVALID: 'AK_CONFIG_INVALID',

  // Runtime errors
  AK_RUNTIME_INVALID_INPUT: 'AK_RUNTIME_INVALID_INPUT',
  AK_RUNTIME_STEP_FAILED: 'AK_RUNTIME_STEP_FAILED',
  AK_RUNTIME_DELEGATE_FAILED: 'AK_RUNTIME_DELEGATE_FAILED',

  // Sandbox errors
  AK_SANDBOX_DENIED: 'AK_SANDBOX_DENIED',
  AK_SANDBOX_INVALID_TOOL: 'AK_SANDBOX_INVALID_TOOL',
  AK_SANDBOX_PEER_MISSING: 'AK_SANDBOX_PEER_MISSING',
  AK_SANDBOX_BACKEND_FAILED: 'AK_SANDBOX_BACKEND_FAILED',

  // Skill errors
  AK_SKILL_INVALID: 'AK_SKILL_INVALID',
  AK_SKILL_DUPLICATE: 'AK_SKILL_DUPLICATE',
} as const
