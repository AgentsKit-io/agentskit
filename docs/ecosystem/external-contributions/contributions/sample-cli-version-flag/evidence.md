# Evidence — sample-cli-version-flag

## Target rules reproduced

From fixture `CONTRIBUTING.md`:

- small focused change
- tests under `tests/`
- no marketing-only links
- ESM + `node:test`

## Setup reproduced

```bash
cd docs/ecosystem/external-contributions/fixtures/sample-cli
node --test
```

Observed: greet test passes; version missing.

## Tests added

- `tests/version.test.js` — asserts `version` exits 0 and prints semver-like version

## Submission package

Prepared for human approval. Not submitted externally (fixture target).
