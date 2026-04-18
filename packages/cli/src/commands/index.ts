import { Command } from 'commander'
import { registerChatCommand } from './chat'
import { registerRunCommand } from './run'
import { registerInitCommand } from './init'
import { registerDoctorCommand } from './doctor'
import { registerDevCommand } from './dev'
import { registerConfigCommand } from './config'
import { registerTunnelCommand } from './tunnel'
import { registerRagCommand } from './rag'

export function createCli(): Command {
  const program = new Command()
  program
    .name('agentskit')
    .description('AgentsKit CLI for chat demos and project bootstrapping.')

  registerChatCommand(program)
  registerRunCommand(program)
  registerInitCommand(program)
  registerDoctorCommand(program)
  registerDevCommand(program)
  registerConfigCommand(program)
  registerTunnelCommand(program)
  registerRagCommand(program)

  return program
}
