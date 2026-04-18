import type { Command } from 'commander'
import { startTunnel } from '../tunnel'

export function registerTunnelCommand(program: Command): void {
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
}
