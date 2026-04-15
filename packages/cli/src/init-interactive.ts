import { input, select, checkbox, confirm } from '@inquirer/prompts'
import kleur from 'kleur'
import path from 'node:path'
import { existsSync } from 'node:fs'
import type {
  InitCommandOptions,
  StarterKind,
  Provider,
  ToolKind,
  MemoryKind,
  PackageManager,
} from './init'

interface InteractiveResult {
  options: InitCommandOptions
  cancelled: boolean
}

/**
 * Run the interactive init flow. Returns the resolved InitCommandOptions
 * to feed into writeStarterProject. If the user cancels (Ctrl+C), returns
 * { cancelled: true }.
 */
export async function runInteractiveInit(
  defaults: { dir?: string; template?: StarterKind } = {},
): Promise<InteractiveResult> {
  process.stdout.write(`\n${kleur.bold().green('▲')} ${kleur.bold('agentskit init')}\n`)
  process.stdout.write(kleur.dim('   Generate a starter project — answer five questions.\n\n'))

  try {
    const targetDir = await input({
      message: 'Project directory:',
      default: defaults.dir ?? 'agentskit-app',
      validate: (value) => {
        if (!value.trim()) return 'A directory name is required.'
        const abs = path.resolve(process.cwd(), value)
        if (existsSync(abs)) return `${value} already exists. Pick a different name.`
        return true
      },
    })

    const template = (await select<StarterKind>({
      message: 'Template:',
      default: defaults.template ?? 'react',
      choices: [
        { name: 'React chat (Vite + browser)', value: 'react', description: 'Streaming UI with @agentskit/react' },
        { name: 'Ink chat (terminal UI)', value: 'ink', description: 'Same chat but in your terminal' },
        { name: 'Runtime (headless agent, no UI)', value: 'runtime', description: 'Autonomous task → result' },
        { name: 'Multi-agent (planner + delegates)', value: 'multi-agent', description: 'Supervisor pattern, ready to extend' },
      ],
    })) as StarterKind

    const provider = (await select<Provider>({
      message: 'LLM provider:',
      default: 'demo',
      choices: [
        { name: 'Demo (no API key — deterministic stub)', value: 'demo' },
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic', value: 'anthropic' },
        { name: 'Gemini', value: 'gemini' },
        { name: 'Ollama (local, no key)', value: 'ollama' },
      ],
    })) as Provider

    let tools: ToolKind[] = []
    if (template !== 'react') {
      // React template focuses on chat; tools are most useful in runtime / multi-agent / ink
      tools = (await checkbox<ToolKind>({
        message: 'Tools (space to toggle, enter to confirm):',
        choices: [
          { name: 'web_search', value: 'web_search' },
          { name: 'filesystem', value: 'filesystem' },
          { name: 'shell', value: 'shell' },
        ],
      })) as ToolKind[]
    }

    const memory = (await select<MemoryKind>({
      message: 'Memory backend:',
      default: 'none',
      choices: [
        { name: 'None (stateless)', value: 'none' },
        { name: 'File (JSON on disk)', value: 'file' },
        { name: 'SQLite (better-sqlite3)', value: 'sqlite' },
      ],
    })) as MemoryKind

    const packageManager = (await select<PackageManager>({
      message: 'Package manager:',
      default: 'pnpm',
      choices: [
        { name: 'pnpm', value: 'pnpm' },
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'bun', value: 'bun' },
      ],
    })) as PackageManager

    process.stdout.write('\n' + kleur.dim('  Summary:\n'))
    process.stdout.write(kleur.dim(`    dir       ${targetDir}\n`))
    process.stdout.write(kleur.dim(`    template  ${template}\n`))
    process.stdout.write(kleur.dim(`    provider  ${provider}\n`))
    if (tools.length) process.stdout.write(kleur.dim(`    tools     ${tools.join(', ')}\n`))
    process.stdout.write(kleur.dim(`    memory    ${memory}\n`))
    process.stdout.write(kleur.dim(`    pm        ${packageManager}\n\n`))

    const proceed = await confirm({ message: 'Generate?', default: true })
    if (!proceed) {
      process.stdout.write(kleur.yellow('Cancelled.\n'))
      return { cancelled: true, options: { targetDir, template, provider, tools, memory, packageManager } }
    }

    return {
      cancelled: false,
      options: {
        targetDir: path.resolve(process.cwd(), targetDir),
        template,
        provider,
        tools,
        memory,
        packageManager,
      },
    }
  } catch (err) {
    // ExitPromptError thrown on Ctrl+C
    if ((err as Error).name === 'ExitPromptError') {
      process.stdout.write(kleur.yellow('\nCancelled.\n'))
      return { cancelled: true, options: { targetDir: '', template: 'react' } }
    }
    throw err
  }
}

export function printNextSteps(options: InitCommandOptions): void {
  const dir = path.relative(process.cwd(), options.targetDir) || '.'
  const pm = options.packageManager ?? 'pnpm'
  const installCmd = pm === 'npm' ? 'npm install' : `${pm} install`
  const runCmd = pm === 'npm' ? 'npm run dev' : `${pm} dev`

  process.stdout.write('\n' + kleur.green('✓ Created starter at ') + kleur.bold(dir) + '\n\n')
  process.stdout.write(kleur.bold('Next steps:\n\n'))
  process.stdout.write(`  ${kleur.cyan('cd')} ${dir}\n`)
  process.stdout.write(`  ${kleur.cyan(installCmd)}\n`)
  if (options.provider && options.provider !== 'demo' && options.provider !== 'ollama') {
    process.stdout.write(
      `  ${kleur.cyan('cp')} .env.example .env  ${kleur.dim('# add your API key')}\n`,
    )
  }
  process.stdout.write(`  ${kleur.cyan(runCmd)}\n\n`)
  process.stdout.write(kleur.dim('  Docs: https://agentskit.io/docs\n\n'))
}
