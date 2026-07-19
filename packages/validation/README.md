# @agentskit/tools/validation

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Opt-in runtime validation of model-proposed tool arguments against each tool's existing JSON Schema. The implementation is private to this monorepo and ships through the public `@agentskit/tools/validation` subpath.

## Why

Model output is untrusted data. TypeScript inference describes a tool's expected arguments, but it does not validate the JSON produced by a model. `createAjvValidator()` enforces the same JSON Schema at runtime before `execute` runs, without adding Ajv to the zero-dependency core.

Validation is not automatic. You must pass the validator as `validateArgs`; tools without a `schema` remain passthrough.

## Verified proof

- Adversarial tests cover nested objects, arrays, local references, structured paths, coercion, custom Ajv instances, schema failures, caching, and strict-extra behavior.
- Public consumers import `@agentskit/tools/validation`; `@agentskit/validation` is a private workspace implementation.
- Package guide: https://www.agentskit.io/docs/packages/validation
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

`@agentskit/tools/validation` protects the boundary between model output and tool execution.

- **AgentsKit**: compose it with controllers or runtimes as an opt-in `ArgsValidator`.
- **Registry**: look for ready agents and templates at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn production validation patterns at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: apply the same boundary with enterprise governance at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/validation) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/tools
```

## Quick start

<!-- readme-example:quickstart -->
```ts
import { createAjvValidator } from '@agentskit/tools/validation'

const validate = createAjvValidator()
const result = validate(
  {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
  { city: 'Lisbon' },
)

console.log(result.valid)
```

Pass the same validator to a controller or runtime:

```ts
import { createChatController } from '@agentskit/core'
import { createAjvValidator } from '@agentskit/tools/validation'

const chat = createChatController({
  adapter,
  tools: [weatherTool],
  validateArgs: createAjvValidator(),
})
```

Invalid arguments become `AK_TOOL_INVALID_INPUT` before tool execution.

## Options

| Field | Default | Contract |
|---|---|---|
| `rejectAdditionalProperties` | `false` | Recursively adds `additionalProperties: false` to ordinary object boundaries that omit an explicit policy. Explicit `additionalProperties` is preserved. Composition/applicator boundaries are left as authored because draft-07 cannot safely infer their combined property set; declare `additionalProperties: false` explicitly there. |
| `coerceTypes` | `false` | Enables Ajv primitive coercion. Successful validation may mutate the supplied argument object. |
| `ajv` | — | Uses a pre-configured Ajv instance. That instance owns coercion, formats, keywords, strictness, and other Ajv behavior; `coerceTypes` is only used when this package creates Ajv. |

Schemas are trusted application configuration. Invalid or unsupported schemas can throw when first compiled. Argument values are never included in generated validation messages.

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- Public surface: `@agentskit/tools/validation`
- Private implementation: `packages/validation` (`@agentskit/validation`, not separately published)
- Node.js 20+ and TypeScript strict mode

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
