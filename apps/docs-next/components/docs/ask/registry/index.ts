import { createRegistry, defineUITool, type UiTool } from './define-ui-tool'
import {
  CodeBlockTool,
  Form,
  OpenPage,
  Options,
  RunResult,
} from './components'

/**
 * The default generative-UI tool set, keyed by the wire names declared in
 * `lib/ask/protocol.ts`. `createRegistry` cross-checks each name against
 * `UI_TOOL_NAMES`, so this list can never advertise a tool the server doesn't.
 *
 * Every component narrows its own `args` internally (typing props as
 * `UiToolProps<unknown>`), so `defineUITool` infers `P = unknown` uniformly and
 * the registry stores `UiTool<unknown>` — no erasure gymnastics needed.
 */
export const DEFAULT_UI_TOOLS: ReadonlyArray<UiTool<unknown>> = [
  defineUITool({ name: 'showOptions', Component: Options }),
  defineUITool({ name: 'renderForm', Component: Form }),
  defineUITool({ name: 'codeBlock', Component: CodeBlockTool }),
  defineUITool({ name: 'runExample', Component: RunResult }),
  defineUITool({ name: 'openPage', Component: OpenPage }),
]

/** The assembled default registry used by the Ask-the-docs widget. */
export const defaultRegistry = createRegistry(DEFAULT_UI_TOOLS)

export {
  createRegistry,
  defineUITool,
  type UiTool,
  type UiToolContext,
  type UiToolProps,
  type UiToolRegistry,
} from './define-ui-tool'
