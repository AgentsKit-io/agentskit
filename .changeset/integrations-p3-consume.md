---
'@agentskit/integrations': minor
'@agentskit/cli': minor
---

P3 — consume the integration catalog from agents and the CLI.

- `@agentskit/integrations`: add `integrationTools(slugOrDescriptor, config)` (one-call projection to `ToolDefinition[]`), `integrationToolsFromEnv(name, env)` (reads the credential from the apiKey `envHint`), and `credentialEnvVar(integration)`.
- `@agentskit/cli`: `agentskit chat --tools <name>` now resolves any catalog integration by slug, reading its API key from the conventional environment variable; warns (without failing) when the key is absent.
