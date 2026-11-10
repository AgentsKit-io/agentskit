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
 *             createChatController({ adapter: openai({ apiKey, model: 'gpt-4o' }) })
 *   --> Docs: https://www.agentskit.io/docs/data/providers
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

/** Base error with a stable code, optional hint, docs link, and cause. */
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

/** Error raised when an adapter is missing or cannot provide its stream. */
export class AdapterError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/data/providers`, ...options })
    this.name = 'AdapterError'
  }
}

/** Error raised when a tool is missing, invalid, forbidden, or fails. */
export class ToolError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/agents/tools`, ...options })
    this.name = 'ToolError'
  }
}

/** Error raised when chat memory cannot load, save, or clear data. */
export class MemoryError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/data/memory`, ...options })
    this.name = 'MemoryError'
  }
}

/** Error raised for invalid or incomplete AgentsKit configuration. */
export class ConfigError extends AgentsKitError {
  constructor(options: {
    code: string
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: `${DOCS_BASE}/get-started/concepts/errors`, ...options })
    this.name = 'ConfigError'
  }
}

/** Error raised when a runtime input or execution step fails. */
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

/** Error raised when sandbox policy or execution fails. */
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

/** Error raised when a skill definition or activation is invalid. */
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

/** Stable error-code strings used by AgentsKit error classes. */
export const ErrorCodes = {
  // Adapter errors
  AK_ADAPTER_MISSING: 'AK_ADAPTER_MISSING',
  AK_ADAPTER_STREAM_FAILED: 'AK_ADAPTER_STREAM_FAILED',

  // Tool errors
  AK_TOOL_NOT_FOUND: 'AK_TOOL_NOT_FOUND',
  AK_TOOL_EXEC_FAILED: 'AK_TOOL_EXEC_FAILED',
  AK_TOOL_PEER_MISSING: 'AK_TOOL_PEER_MISSING',
  AK_TOOL_INVALID_INPUT: 'AK_TOOL_INVALID_INPUT',
  AK_TOOL_QUOTA_EXCEEDED: 'AK_TOOL_QUOTA_EXCEEDED',
  AK_TOOL_FORBIDDEN: 'AK_TOOL_FORBIDDEN',

  AK_ACTION_NOT_FOUND: 'AK_ACTION_NOT_FOUND',
  AK_ACTION_ALREADY_DECIDED: 'AK_ACTION_ALREADY_DECIDED',

  // Memory errors
  AK_MEMORY_LOAD_FAILED: 'AK_MEMORY_LOAD_FAILED',
  AK_MEMORY_SAVE_FAILED: 'AK_MEMORY_SAVE_FAILED',
  AK_MEMORY_CLEAR_FAILED: 'AK_MEMORY_CLEAR_FAILED',
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
