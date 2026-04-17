import { describe, it, expect } from 'vitest'
import {
  AgentsKitError,
  AdapterError,
  ToolError,
  MemoryError,
  ConfigError,
  ErrorCodes,
} from '../src/errors'

describe('AgentsKitError', () => {
  it('is an instance of Error', () => {
    const err = new AgentsKitError({
      code: 'AK_TEST',
      message: 'something broke',
    })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AgentsKitError)
  })

  it('stores code, message, hint, and docsUrl', () => {
    const err = new AgentsKitError({
      code: 'AK_TEST',
      message: 'something broke',
      hint: 'try fixing it',
      docsUrl: 'https://example.com/docs',
    })
    expect(err.code).toBe('AK_TEST')
    expect(err.message).toBe('something broke')
    expect(err.hint).toBe('try fixing it')
    expect(err.docsUrl).toBe('https://example.com/docs')
    expect(err.name).toBe('AgentsKitError')
  })

  it('toString() formats Rust-style output with hint and docs', () => {
    const err = new AgentsKitError({
      code: 'AK_TEST',
      message: 'something broke',
      hint: 'try fixing it',
      docsUrl: 'https://example.com/docs',
    })
    const output = err.toString()
    expect(output).toContain('error[AK_TEST]: something broke')
    expect(output).toContain('  --> Hint: try fixing it')
    expect(output).toContain('  --> Docs: https://example.com/docs')
  })

  it('toString() omits hint and docs when not provided', () => {
    const err = new AgentsKitError({
      code: 'AK_MINIMAL',
      message: 'minimal error',
    })
    const output = err.toString()
    expect(output).toBe('error[AK_MINIMAL]: minimal error')
    expect(output).not.toContain('Hint')
    expect(output).not.toContain('Docs')
  })

  it('preserves cause', () => {
    const cause = new TypeError('original')
    const err = new AgentsKitError({
      code: 'AK_TEST',
      message: 'wrapped',
      cause,
    })
    expect(err.cause).toBe(cause)
  })
})

describe('AdapterError', () => {
  it('is an instance of AgentsKitError and Error', () => {
    const err = new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'stream broke',
    })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AgentsKitError)
    expect(err).toBeInstanceOf(AdapterError)
    expect(err.name).toBe('AdapterError')
  })

  it('defaults docsUrl to the adapters docs page', () => {
    const err = new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'stream broke',
    })
    expect(err.docsUrl).toContain('/adapters')
  })

  it('allows overriding docsUrl', () => {
    const err = new AdapterError({
      code: ErrorCodes.AK_ADAPTER_MISSING,
      message: 'no adapter',
      docsUrl: 'https://custom.docs/page',
    })
    expect(err.docsUrl).toBe('https://custom.docs/page')
  })
})

describe('ToolError', () => {
  it('is an instance of AgentsKitError', () => {
    const err = new ToolError({
      code: ErrorCodes.AK_TOOL_NOT_FOUND,
      message: 'tool missing',
    })
    expect(err).toBeInstanceOf(AgentsKitError)
    expect(err).toBeInstanceOf(ToolError)
    expect(err.name).toBe('ToolError')
    expect(err.docsUrl).toContain('/tools')
  })
})

describe('MemoryError', () => {
  it('is an instance of AgentsKitError', () => {
    const err = new MemoryError({
      code: ErrorCodes.AK_MEMORY_LOAD_FAILED,
      message: 'load failed',
    })
    expect(err).toBeInstanceOf(AgentsKitError)
    expect(err).toBeInstanceOf(MemoryError)
    expect(err.name).toBe('MemoryError')
    expect(err.docsUrl).toContain('/memory')
  })
})

describe('ConfigError', () => {
  it('is an instance of AgentsKitError', () => {
    const err = new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'bad config',
      hint: 'check your config object',
    })
    expect(err).toBeInstanceOf(AgentsKitError)
    expect(err).toBeInstanceOf(ConfigError)
    expect(err.name).toBe('ConfigError')
    expect(err.docsUrl).toContain('/configuration')
    expect(err.hint).toBe('check your config object')
  })
})

describe('ErrorCodes', () => {
  it('contains namespaced error codes', () => {
    expect(ErrorCodes.AK_ADAPTER_MISSING).toBe('AK_ADAPTER_MISSING')
    expect(ErrorCodes.AK_ADAPTER_STREAM_FAILED).toBe('AK_ADAPTER_STREAM_FAILED')
    expect(ErrorCodes.AK_TOOL_NOT_FOUND).toBe('AK_TOOL_NOT_FOUND')
    expect(ErrorCodes.AK_TOOL_EXEC_FAILED).toBe('AK_TOOL_EXEC_FAILED')
    expect(ErrorCodes.AK_MEMORY_LOAD_FAILED).toBe('AK_MEMORY_LOAD_FAILED')
    expect(ErrorCodes.AK_MEMORY_SAVE_FAILED).toBe('AK_MEMORY_SAVE_FAILED')
    expect(ErrorCodes.AK_MEMORY_DESERIALIZE_FAILED).toBe('AK_MEMORY_DESERIALIZE_FAILED')
    expect(ErrorCodes.AK_CONFIG_INVALID).toBe('AK_CONFIG_INVALID')
  })
})

describe('toString() multiline format', () => {
  it('produces the expected Rust-compiler-style output', () => {
    const err = new ToolError({
      code: ErrorCodes.AK_TOOL_NOT_FOUND,
      message: 'Tool "webSearch" not found or has no execute function',
      hint: 'Register the tool in your ChatConfig, e.g. { tools: [webSearchTool] }.',
    })
    const lines = err.toString().split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('error[AK_TOOL_NOT_FOUND]: Tool "webSearch" not found or has no execute function')
    expect(lines[1]).toBe('  --> Hint: Register the tool in your ChatConfig, e.g. { tools: [webSearchTool] }.')
    expect(lines[2]).toMatch(/^ {2}--> Docs: https:\/\/www\.agentskit\.io\/docs\/tools$/)
  })
})
