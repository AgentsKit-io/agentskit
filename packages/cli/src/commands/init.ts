import path from 'node:path'
import type { Command } from 'commander'
import { writeStarterProject } from '../init'
import type { StarterKind, Provider, ToolKind, MemoryKind, PackageManager } from '../init'
import { runInteractiveInit, printNextSteps } from '../init-interactive'

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Generate a starter project. Run with no flags for interactive mode.')
    .option('--template <template>', 'Starter template (react|nextjs|sveltekit|nuxt|ink|vite-ink|cloudflare-workers|bun|deno-deploy|expo|angular|runtime|multi-agent)')
    .option('--dir <directory>', 'Target directory', 'agentskit-app')
    .option('--provider <provider>', 'LLM provider (openai|anthropic|gemini|ollama|deepseek|grok|kimi|groq|openrouter|demo)')
    .option('--tools <tools>', 'Comma-separated tools (web_search,filesystem,shell)')
    .option('--memory <backend>', 'Memory backend (none|file|sqlite)')
    .option('--pm <packageManager>', 'Package manager (pnpm|npm|yarn|bun)')
    .option('--force', 'Overwrite generated files in a non-empty target directory')
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
          force: Boolean(rawOptions.force),
        }
      } else {
        const result = await runInteractiveInit({
          dir: rawOptions.dir,
          template: rawOptions.template as StarterKind | undefined,
        })
        if (result.cancelled) {
          process.exit(0)
        }
        resolved = { ...result.options, force: Boolean(rawOptions.force) }
      }

      const overwritten = (await writeStarterProject(resolved)) ?? []

      if (isCi) {
        process.stdout.write(
          `Created ${resolved.template} starter in ${path.relative(process.cwd(), resolved.targetDir) || '.'}\n` +
            (overwritten.length > 0 ? `Overwritten: ${overwritten.join(', ')}\n` : '') +
            `★ Star AgentsKit (solo-built — it helps a lot): https://github.com/AgentsKit-io/agentskit\n`,
        )
      } else {
        printNextSteps(resolved)
        if (overwritten.length > 0) {
          process.stdout.write(`Overwritten: ${overwritten.join(', ')}\n`)
        }
      }
    })
}
