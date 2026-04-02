# Contributing to AgentKit

Thanks for wanting to contribute! Here's how to get started.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
git clone https://github.com/EmersonBraun/agentkit.git
cd agentkit
npm install
```

## Development Workflow

```bash
# Run tests in watch mode
npm run test:watch

# Type check
npm run lint

# Build the library
npm run build

# Run docs site locally
cd docs && npm install && npm start
```

## Making Changes

1. **Fork** the repo and create a branch from `main`
2. **Write tests** for any new functionality
3. **Run the full test suite** before submitting: `npm test`
4. **Type check** passes: `npm run lint`
5. **Keep commits focused** — one logical change per commit

## Pull Request Guidelines

- Keep PRs small and focused on a single concern
- Include a clear description of what changed and why
- Update docs if you changed the public API
- All CI checks must pass

## Code Style

- TypeScript strict mode
- No `any` types — use `unknown` and narrow
- Prefer named exports over default exports
- Components are headless — no hardcoded styles, use `data-ak-*` attributes

## Project Structure

```
src/
  core/       — hooks (useStream, useReactive, useChat) and types
  components/ — headless React components
  adapters/   — AI provider streaming adapters
  theme/      — optional default CSS theme
tests/        — mirrors src/ structure
docs/         — Docusaurus documentation site
```

## Running Tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
```

## Questions?

Open an issue — we're happy to help!
