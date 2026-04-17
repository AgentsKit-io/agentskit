---
"@agentskit/core": minor
"@agentskit/tools": minor
---

Add automatic tool type inference from JSON Schema and Zod schemas

- `ToolDefinition` is now generic `ToolDefinition<TArgs>` with backward-compatible default
- New `defineTool()` helper in core infers execute args from `as const` JSON schemas
- New `defineZodTool()` helper in tools infers execute args from Zod schemas (zod remains optional)
- JSON Schema type inference supports string, number, integer, boolean, null, array, and nested object types
- Required vs optional properties are correctly inferred from the `required` array
