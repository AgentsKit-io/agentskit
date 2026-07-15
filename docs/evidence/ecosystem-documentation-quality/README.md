# Ecosystem documentation attestation evidence

The seven JSON payloads are the stable v1 attestation ledger. Each records canonical product
identity, a base commit, an explicit `commit` or `working-tree` source mode, a deterministic
digest of every declared local evidence path, and a separate Doc Bridge result artifact. A
working-tree attestation never claims that dirty content belongs to its base commit.

Run the portable attestation gate. Without repository roots it may be eligible, but it is
intentionally never certified:

```bash
pnpm check:ecosystem-doc-quality
```

For a full local recertification, check out all repositories and pass their roots:

```bash
node scripts/check-ecosystem-documentation-quality.mjs \
  --evidence-dir docs/evidence/ecosystem-documentation-quality \
  --verify-local --require-certified \
  --repo-root agentskit=. --repo-root registry=. \
  --repo-root agentskit-chat=../agentskit-chat \
  --repo-root playbook=../agents-playbook \
  --repo-root doc-bridge=../doc-bridge \
  --repo-root code-review=../code-review-cli \
  --repo-root akos=../agentskit-os
```

The local mode is the only certification mode. It binds every payload to repository HEAD,
recomputes its content digest, validates the separate Doc Bridge artifact, executes live
`ak-docs doctor --json` and Documentation Standard v1 conformance in every root, and inspects
visual and contextual-link content. The artifact is a ledger, never the authority: live score,
coverage, and 7+2 summaries must match it and the payload. Updating an attestation requires
rerunning those checks, then refreshing its payload digest and artifact.
