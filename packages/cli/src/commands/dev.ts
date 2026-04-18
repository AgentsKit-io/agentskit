import type { Command } from 'commander'
import { startDev } from '../dev'

export function registerDevCommand(program: Command): void {
  program
    .command('dev [entry]')
    .description('Run an entry file with hot-reload on file changes.')
    .option('--watch <globs>', 'Comma-separated glob patterns to watch')
    .option('--ignore <globs>', 'Comma-separated glob patterns to ignore')
    .option('--debounce <ms>', 'Debounce window before restart', '200')
    .action(async (positional: string | undefined, options) => {
      const entry = positional ?? 'src/index.ts'
      const watch = options.watch
        ? (options.watch as string).split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined
      const ignore = options.ignore
        ? (options.ignore as string).split(',').map((s: string) => s.trim()).filter(Boolean)
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
}
