# Conventions — `@agentskit/cli`

The `agentskit` command-line interface. The entry point for people who want to try AgentsKit without writing code first.

## Scope

- `agentskit chat` — interactive Ink chat with any provider
- `agentskit init` — scaffold a new project
- `agentskit run` — execute runtime agents from the terminal
- Future: `agentskit doctor`, `agentskit dev`, `agentskit tunnel` (tracked in Phase 1)

## Adding a new command

1. Create `src/commands/<name>.ts`.
2. Export a function that takes parsed arguments and runs the command — no classes.
3. Wire the command in `src/bin.ts` using the existing argv parser.
4. Print help output that fits on one screen (`--help` reads as documentation).
5. Exit cleanly with `process.exit(code)` only at the top level. Never in a library function.

## Output conventions

- Keep terminal output terse. One line per meaningful event.
- Use `chalk` or Ink for color. Do not hardcode ANSI codes.
- Respect `--quiet` and `--json` flags where applicable.
- Errors go to stderr; structured output goes to stdout.

## Flag conventions

- Short form (`-p`) for frequent flags, long form (`--provider`) always present.
- Defaults shown in `--help`.
- Mutually-exclusive flags fail fast with a clear error.

## Testing

- Use `vitest` with child-process spawns for e2e coverage of the `bin.ts` entry.
- Unit-test individual commands with mocked adapters.
- Test fixtures live in `tests/fixtures/`.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Using `process.exit` in a library function | Return an exit code from the command function; only `bin.ts` calls `process.exit` |
| Reading `process.argv` outside `bin.ts` | Pass parsed args down |
| Hardcoding provider names | Accept `--provider <name>` and route to the right adapter |
| Emitting unstructured text with `--json` set | Emit JSON; add `--format=json` if both are needed |

## Review checklist for this package

- [ ] Bundle size under 20KB gzipped
- [ ] Coverage threshold holds (30%, climbing)
- [ ] `--help` output is one screen and accurate
- [ ] Spawn-based e2e test for the new command
- [ ] Exit codes: 0 success, 1 expected failure, 2 usage error
