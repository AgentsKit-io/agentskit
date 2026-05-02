import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface MockAnswers {
  input?: string
  select?: string[]
  checkbox?: string[][]
  confirm?: boolean[]
  inputThrow?: Error
  selectThrow?: Error
  confirmThrow?: Error
}

let answers: MockAnswers = {}
let answerIndex = { select: 0, checkbox: 0, confirm: 0 }

beforeEach(() => {
  answers = {
    input: 'agentskit-app-test',
    select: ['react', 'demo', 'none', 'pnpm'],
    checkbox: [],
    confirm: [true],
  }
  answerIndex = { select: 0, checkbox: 0, confirm: 0 }
  vi.doMock('@inquirer/prompts', () => ({
    input: vi.fn(async () => {
      if (answers.inputThrow) throw answers.inputThrow
      return answers.input
    }),
    select: vi.fn(async () => {
      if (answers.selectThrow) throw answers.selectThrow
      const value = answers.select![answerIndex.select++]
      return value
    }),
    checkbox: vi.fn(async () => {
      const value = answers.checkbox![answerIndex.checkbox++] ?? []
      return value
    }),
    confirm: vi.fn(async () => {
      if (answers.confirmThrow) throw answers.confirmThrow
      return answers.confirm![answerIndex.confirm++] ?? true
    }),
  }))
})

afterEach(() => {
  vi.doUnmock('@inquirer/prompts')
  vi.resetModules()
})

describe('runInteractiveInit', () => {
  it('returns resolved options on the happy path', async () => {
    const { runInteractiveInit } = await import('../src/init-interactive')
    const result = await runInteractiveInit()
    expect(result.cancelled).toBe(false)
    expect(result.options.template).toBe('react')
    expect(result.options.provider).toBe('demo')
    expect(result.options.memory).toBe('none')
    expect(result.options.packageManager).toBe('pnpm')
    expect(result.options.targetDir).toMatch(/agentskit-app-test$/)
  })

  it('asks for tools when template is not react', async () => {
    answers.select = ['runtime', 'openai', 'file', 'pnpm']
    answers.checkbox = [['web_search', 'filesystem']]
    const { runInteractiveInit } = await import('../src/init-interactive')
    const result = await runInteractiveInit()
    expect(result.options.template).toBe('runtime')
    expect(result.options.tools).toEqual(['web_search', 'filesystem'])
  })

  it('returns cancelled when user declines confirm', async () => {
    answers.confirm = [false]
    const { runInteractiveInit } = await import('../src/init-interactive')
    const result = await runInteractiveInit()
    expect(result.cancelled).toBe(true)
  })

  it('returns cancelled on ExitPromptError (Ctrl+C)', async () => {
    const exitErr = new Error('User force closed the prompt')
    exitErr.name = 'ExitPromptError'
    answers.inputThrow = exitErr
    const { runInteractiveInit } = await import('../src/init-interactive')
    const result = await runInteractiveInit()
    expect(result.cancelled).toBe(true)
  })

  it('rethrows other errors', async () => {
    answers.inputThrow = new Error('disk full')
    const { runInteractiveInit } = await import('../src/init-interactive')
    await expect(runInteractiveInit()).rejects.toThrow('disk full')
  })

  it('uses provided defaults', async () => {
    const { runInteractiveInit } = await import('../src/init-interactive')
    const result = await runInteractiveInit({ dir: 'my-cool-app', template: 'ink' })
    expect(result.options.targetDir).toMatch(/agentskit-app-test$/)
    // Defaults are passed to inquirer; the mock returns the next value
    // from `select` array regardless of default (template='react' here).
    expect(result.options.template).toBe('react')
  })
})

describe('printNextSteps', () => {
  let stdout: string
  let outSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdout = ''
    outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string) => {
      stdout += chunk
      return true
    }) as never)
  })

  afterEach(() => {
    outSpy.mockRestore()
  })

  it('renders cd + install + run lines', async () => {
    const { printNextSteps } = await import('../src/init-interactive')
    printNextSteps({
      targetDir: '/tmp/agentskit-app-test',
      template: 'react',
      provider: 'openai',
      memory: 'none',
      packageManager: 'pnpm',
      tools: [],
    })
    expect(stdout).toContain('cd')
    expect(stdout).toContain('pnpm install')
    expect(stdout).toContain('pnpm dev')
    expect(stdout).toContain('cp .env.example .env')
  })

  it('skips env hint for demo provider', async () => {
    const { printNextSteps } = await import('../src/init-interactive')
    printNextSteps({
      targetDir: '/tmp/x',
      template: 'react',
      provider: 'demo',
      memory: 'none',
      packageManager: 'npm',
      tools: [],
    })
    expect(stdout).not.toContain('cp .env.example')
    expect(stdout).toContain('npm install')
    expect(stdout).toContain('npm run dev')
  })
})
