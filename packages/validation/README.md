# @agentskit/tools/validation

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Opt-in runtime validation of tool-call arguments against their JSON Schema for [AgentsKit](https://www.agentskit.io). Wraps [Ajv](https://ajv.js.org) and plugs into the core `ArgsValidator` contract ([ADR-0008](../../docs/architecture/adrs/0008-runtime-validation.md)).

## Why

The real untrusted boundary in an agent is **model output**. A model returns tool-call arguments as arbitrary JSON. Core parses them but does not check them against the tool's schema — `execute` receives args the type system only *claims* are valid. This package enforces the tool's existing `JSONSchema7` at runtime, so a malformed call fails with `AK_TOOL_INVALID_INPUT` instead of reaching your code.

JSON Schema stays the single source of truth: no Zod, no parallel contract.

## How this fits the ecosystem

`@agentskit/tools/validation` protects tool boundaries by validating model-proposed arguments against JSON Schema before execution.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/validation) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Install

```bash
npm install @agentskit/tools
```

## Usage

```ts
import { createChatController } from '@agentskit/core'
import { createAjvValidator } from '@agentskit/tools/validation'

const chat = createChatController({
  adapter,
  tools: [weatherTool],
  validateArgs: createAjvValidator(),
})
```

Same option exists on `createRuntime`.

## Options

| Field | Default | Notes |
|---|---|---|
| `rejectAdditionalProperties` | `false` | Reject keys not declared in the schema. |
| `coerceTypes` | `false` | Coerce unambiguous primitives before validating. |
| `ajv` | — | Supply a pre-configured Ajv instance. |

## Notes

- **Opt-in.** Without `validateArgs`, behaviour is unchanged. Core stays zero-dependency; Ajv lives only here.
- Tools without a `schema` are skipped.
- Compiled validators are cached by schema identity.

## License

MIT
