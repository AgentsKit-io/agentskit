import type { Command } from 'commander'
import { runDoctor, renderReport } from '../doctor'
import { DEFAULT_DOCTOR_PROVIDERS } from '../provider-registry'

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Diagnose your AgentsKit environment.')
    .option('--no-network', 'Skip provider reachability checks')
    .option(
      '--providers <providers>',
      `Comma-separated providers to check (default: ${DEFAULT_DOCTOR_PROVIDERS.join(',')})`,
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

      if (report.fail > 0) process.exit(1)
    })
}
