export { createSandbox } from './sandbox'
export type { Sandbox, SandboxConfig } from './sandbox'

export { sandboxTool } from './tool'

export { createE2BBackend } from './e2b-backend'
export type { E2BConfig } from './e2b-backend'

export type { SandboxBackend, ExecuteOptions, ExecuteResult } from './types'

export { createMandatorySandbox } from './policy'
export type {
  SandboxPolicy,
  PolicyEvent,
  MandatorySandboxWrapper,
} from './policy'

// Local-process sandbox runtimes — host-process isolation (none / process /
// sandbox-exec / bwrap / docker) complementing the cloud E2B backend. Each
// implements the `SandboxRuntime` adapter the agent runner spawns through.
export { SANDBOX_LEVELS } from './local-sandbox-types'
export type {
  SandboxLevel,
  SandboxRuntime,
  SandboxExecOptions,
  SandboxExecResult,
  Spawner,
  ChildHandle,
  SpawnerExecOptions,
  SpawnerExecResult,
} from './local-sandbox-types'
export { nodeSpawner } from './local-spawner'
export {
  noneSandbox,
  processSandbox,
  exposeAllowedEnvKeys,
  sandboxExecRuntime,
  renderSandboxExecProfile,
} from './local-runtimes'
export type {
  ProcessRuntimeOptions,
  SandboxExecPolicy,
  SandboxExecRuntimeOpts,
} from './local-runtimes'
export {
  bwrapRuntime,
  renderBwrapArgs,
  isBwrapSupported,
  getBwrapPath,
  dockerRuntime,
  renderDockerArgs,
} from './container-runtimes'
export type {
  BwrapPolicy,
  BwrapRuntimeOpts,
  DockerPolicy,
  DockerRuntimeOpts,
} from './container-runtimes'
export {
  SandboxRegistry,
  isStrongIsolation,
  isWeakIsolation,
  assertStrongIsolation,
  weakSandboxBanner,
  WeakSandboxError,
} from './local-registry'
