# Contributing to sample-cli (fixture)

This is a **fixture target** used by the AgentsKit external contribution program tests. It is not a real upstream project.

## Rules

1. Open small, focused pull requests.
2. Every behavior change needs a test under `tests/`.
3. Do not add marketing links without a working example.
4. Match the existing code style: ESM, Node 20+, `node:test`.
5. Include a short summary of user value before any optional ecosystem mention.

## Setup

```bash
cd docs/ecosystem/external-contributions/fixtures/sample-cli
node --test
```

## Acceptance

- Tests pass with `node --test`
- Documentation stays accurate if promotional paragraphs are deleted
