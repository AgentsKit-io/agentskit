import React from 'react'
import { render } from 'ink'
import { Command } from 'commander'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { loadConfig } from './config'
import type { AgentsKitConfig } from './config'
import { ChatApp, renderChatHeader } from './chat'
import { writeStarterProject } from './init'
import type { StarterKind, Provider, ToolKind, MemoryKind, PackageManager } from './init'
import { runInteractiveInit, printNextSteps } from './init-interactive'
import { runAgent } from './run'
import { RunApp } from './run-ui'
import { runDoctor, renderReport } from './doctor'
import { startDev } from './dev'
import { startTunnel } from './tunnel'
import { listSessions, resolveSession } from './sessions'

function mergeWithConfig(options: Record<string, unknown>, config: AgentsKitConfig | undefined): Record<string, unknown> {
  if (!config) return options
  const d = config.defaults ?? {}

  // Resolve api key: explicit flag first, then env var named by config, then
  // a literal `apiKey` in the config (discouraged but supported).
  const resolvedApiKey =
    (options.apiKey as string | undefined) ??
    (d.apiKeyEnv ? process.env[d.apiKeyEnv] : undefined) ??
    d.apiKey

  return {
    ...options,
    // Config defaults — only apply if CLI flag wasn't set
    provider: options.provider !== 'demo' ? options.provider : (d.provider ?? options.provider),
    model: options.model ?? d.model,
    apiKey: resolvedApiKey,
    baseUrl: options.baseUrl ?? d.baseUrl,
    tools: options.tools ?? d.tools,
    skill: options.skill ?? d.skill,
    system: options.system ?? d.system,
    memoryBackend: options.memoryBackend ?? d.memoryBackend,
  }
}

export function createCli() {
  const program = new Command()

  program
    .name('agentskit')
    .description('AgentsKit CLI for chat demos and project bootstrapping.')

  program
    .command('chat')
    .description('Start a terminal chat session.')
    .option('--provider <provider>', 'Provider to use', 'demo')
    .option('--model <model>', 'Model name')
    .option('--api-key <key>', 'API key for the selected provider')
    .option('--base-url <url>', 'Override provider base URL')
    .option('--system <prompt>', 'System prompt')
    .option('--memory <path>', 'Explicit memory file path (overrides session management)')
    .option('--tools <tools>', 'Comma-separated tools: web_search,fetch_url,filesystem,shell')
    .option('--skill <skills>', 'Comma-separated skills: researcher,coder,planner,critic,summarizer')
    .option('--memory-backend <backend>', 'Memory backend: file (default), sqlite')
    .option('--new', 'Start a fresh chat session (ignore previous conversations in this directory)')
    .option('--resume [id]', 'Resume a prior session by id; omit id to resume the latest')
    .option('--list-sessions', 'List saved sessions for this directory and exit')
    .option('--no-config', 'Skip loading .agentskit.config.json')
    .action(async (options) => {
      if (options.listSessions) {
        const sessions = listSessions()
        if (sessions.length === 0) {
          process.stdout.write('No saved sessions for this directory.\n')
          return
        }
        for (const s of sessions) {
          const { id, updatedAt, messageCount, preview, model } = s.metadata
          process.stdout.write(
            `${id}  ${updatedAt}  msgs=${messageCount}${model ? `  model=${model}` : ''}\n    ${preview}\n`
          )
        }
        return
      }

      const config = options.config !== false ? await loadConfig() : undefined
      const merged = mergeWithConfig(options, config)

      const session = resolveSession({
        explicitPath: options.memory as string | undefined,
        forceNew: Boolean(options.new),
        resumeId: options.resume,
      })

      if (!session.isNew && !options.memory) {
        process.stdout.write(
          `Resuming session ${session.id}. Start fresh with --new or list with --list-sessions.\n`
        )
      }

      const chatOptions = {
        apiKey: (merged.apiKey ?? options.apiKey) as string | undefined,
        baseUrl: (merged.baseUrl ?? options.baseUrl) as string | undefined,
        provider: merged.provider as string,
        model: merged.model as string | undefined,
        system: (merged.system ?? options.system) as string | undefined,
        memoryPath: session.file,
        sessionId: session.id,
        tools: (merged.tools ?? options.tools) as string | undefined,
        skill: (merged.skill ?? options.skill) as string | undefined,
        memoryBackend: (merged.memoryBackend ?? options.memoryBackend) as string | undefined,
        agentsKitConfig: config,
      }
      process.stdout.write(`${renderChatHeader(chatOptions)}\n`)
      const instance = render(React.createElement(ChatApp, chatOptions))
      await instance.waitUntilExit()

      // Farewell line tells the user exactly how to pick the conversation back up.
      if (options.memory) {
        process.stdout.write(
          `\nSession saved to ${session.file}. Resume with --memory ${session.file}\n`
        )
      } else {
        process.stdout.write(
          `\nSession saved. Resume with:\n  agentskit chat --resume ${session.id}\nOr start fresh with:\n  agentskit chat --new\n`
        )
      }
    })

  program
    .command('run [task]')
    .description('Execute an agent task and output the result.')
    .option('--task <task>', 'Task string (alternative to positional argument)')
    .option('--provider <provider>', 'Provider to use', 'demo')
    .option('--model <model>', 'Model name')
    .option('--api-key <key>', 'API key for the selected provider')
    .option('--base-url <url>', 'Override provider base URL')
    .option('--skill <skill>', 'Single skill to use')
    .option('--skills <skills>', 'Comma-separated skills (composed together)')
    .option('--tools <tools>', 'Comma-separated tools: web_search,filesystem,shell')
    .option('--memory <path>', 'Path for memory persistence')
    .option('--memory-backend <backend>', 'Memory backend: file (default), sqlite')
    .option('--system-prompt <prompt>', 'System prompt')
    .option('--max-steps <steps>', 'Maximum agent steps', '10')
    .option('--verbose', 'Stream agent steps to stderr')
    .option('--pretty', 'Use rich Ink-based output')
    .option('--no-config', 'Skip loading .agentskit.config.json')
    .action(async (positionalTask: string | undefined, options) => {
      const task = options.task ?? positionalTask
      if (!task) {
        process.stderr.write('Error: task is required. Pass as argument or use --task.\n')
        process.exit(1)
      }

      const config = options.config !== false ? await loadConfig() : undefined
      const merged = mergeWithConfig(options, config)

      if (options.pretty) {
        render(React.createElement(RunApp, { task, options }))
      } else {
        try {
          await runAgent(task, { ...options, provider: merged.provider, model: merged.model })
        } catch (err) {
          process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
          process.exit(1)
        }
      }
    })

  program
    .command('init')
    .description('Generate a starter project. Run with no flags for interactive mode.')
    .option('--template <template>', 'Starter template (react|ink|runtime|multi-agent)')
    .option('--dir <directory>', 'Target directory', 'agentskit-app')
    .option('--provider <provider>', 'LLM provider (openai|anthropic|gemini|ollama|demo)')
    .option('--tools <tools>', 'Comma-separated tools (web_search,filesystem,shell)')
    .option('--memory <backend>', 'Memory backend (none|file|sqlite)')
    .option('--pm <packageManager>', 'Package manager (pnpm|npm|yarn|bun)')
    .option('-y, --yes', 'Skip interactive prompts; use flag values + defaults')
    .action(async (rawOptions) => {
      const isCi = !process.stdout.isTTY || rawOptions.yes || rawOptions.template
      let resolved: Parameters<typeof writeStarterProject>[0]

      if (isCi) {
        const template = (rawOptions.template ?? 'react') as StarterKind
        resolved = {
          targetDir: path.resolve(process.cwd(), rawOptions.dir),
          template,
          provider: (rawOptions.provider ?? 'demo') as Provider,
          tools: rawOptions.tools
            ? (rawOptions.tools.split(',').map((t: string) => t.trim()) as ToolKind[])
            : [],
          memory: (rawOptions.memory ?? 'none') as MemoryKind,
          packageManager: (rawOptions.pm ?? 'pnpm') as PackageManager,
        }
      } else {
        const result = await runInteractiveInit({
          dir: rawOptions.dir,
          template: rawOptions.template as StarterKind | undefined,
        })
        if (result.cancelled) {
          process.exit(0)
        }
        resolved = result.options
      }

      await writeStarterProject(resolved)

      if (isCi) {
        process.stdout.write(
          `Created ${resolved.template} starter in ${path.relative(process.cwd(), resolved.targetDir) || '.'}\n`,
        )
      } else {
        printNextSteps(resolved)
      }
    })

  program
    .command('doctor')
    .description('Diagnose your AgentsKit environment.')
    .option('--no-network', 'Skip provider reachability checks')
    .option(
      '--providers <providers>',
      'Comma-separated providers to check (default: openai,anthropic,gemini,ollama)',
    )
    .option('--json', 'Emit JSON instead of formatted output')
    .action(async (options) => {
      const providers = options.providers
        ? options.providers.split(',').map((p: string) => p.trim()).filter(Boolean)
        : undefined

      const report = await runDoctor({
        providers,
        noNetwork: options.network === false,
      })

      if (options.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + '\n')
      } else {
        process.stdout.write(renderReport(report, { color: process.stdout.isTTY }))
      }

      // Non-zero exit when any check failed — useful for CI scripts.
      if (report.fail > 0) process.exit(1)
    })

  program
    .command('dev [entry]')
    .description('Run an entry file with hot-reload on file changes.')
    .option('--watch <globs>', 'Comma-separated glob patterns to watch')
    .option('--ignore <globs>', 'Comma-separated glob patterns to ignore')
    .option('--debounce <ms>', 'Debounce window before restart', '200')
    .action(async (positional: string | undefined, options) => {
      const entry = positional ?? 'src/index.ts'
      const watch = options.watch
        ? (options.watch as string).split(',').map(s => s.trim()).filter(Boolean)
        : undefined
      const ignore = options.ignore
        ? (options.ignore as string).split(',').map(s => s.trim()).filter(Boolean)
        : undefined

      try {
        const controller = startDev({
          entry,
          watch,
          ignore,
          debounceMs: Number(options.debounce) || 200,
        })
        await controller.done
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`)
        process.exit(1)
      }
    })

  program
    .command('config')
    .description('Show or scaffold the AgentsKit config.')
    .argument('[action]', 'Action: "init" to create a template, "show" to print the merged config.', 'show')
    .option('--global', 'Write/read the global config at ~/.agentskit/config.json (default)')
    .option('--local', 'Write/read a project-level .agentskit.config.json in the current directory')
    .option('--force', 'Overwrite an existing config file')
    .action(async (action: string, options) => {
      const isLocal = Boolean(options.local)
      const targetPath = isLocal
        ? path.join(process.cwd(), '.agentskit.config.json')
        : path.join(homedir(), '.agentskit', 'config.json')

      if (action === 'show') {
        const config = await loadConfig()
        process.stdout.write(JSON.stringify(config ?? {}, null, 2) + '\n')
        return
      }

      if (action !== 'init') {
        process.stderr.write(`Unknown action: ${action}. Use "init" or "show".\n`)
        process.exit(2)
      }

      if (existsSync(targetPath) && !options.force) {
        process.stderr.write(`Config already exists at ${targetPath}. Re-run with --force to overwrite.\n`)
        process.exit(1)
      }

      const template = {
        defaults: {
          provider: 'openai',
          baseUrl: 'https://openrouter.ai/api',
          apiKeyEnv: 'OPENROUTER_API_KEY',
          model: 'openai/gpt-oss-120b:free',
          tools: 'web_search,fetch_url',
        },
      }

      mkdirSync(path.dirname(targetPath), { recursive: true })
      writeFileSync(targetPath, JSON.stringify(template, null, 2) + '\n')
      process.stdout.write(
        `Wrote ${targetPath}\n` +
        `Edit it to taste, then run:\n  agentskit chat\n` +
        `(flags on the CLI still win over config values.)\n`
      )
    })

  program
    .command('tunnel <port>')
    .description('Open a public URL pointing to a local port (great for webhooks).')
    .option('--subdomain <name>', 'Hint for a stable subdomain (provider may decline)')
    .option('--host <host>', 'Local hostname', 'localhost')
    .action(async (port: string, options) => {
      const portNum = Number(port)
      if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
        process.stderr.write(`Error: invalid port: ${port}\n`)
        process.exit(2)
      }
      try {
        const controller = await startTunnel({
          port: portNum,
          subdomain: options.subdomain,
          host: options.host,
        })
        await controller.done
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`)
        process.exit(1)
      }
    })

  return program
}
