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
  --repo-root code-review=../code-review \
```

The Doc Bridge score is a floor of 90, not an equality. It was exactly 100 while Doc Bridge scored
the index, the handoff corpus and the gates — sixty points a well-kept repository takes completely.
From 1.10.0 forty of the hundred come from reachability, connectivity and a retrieval benchmark, so
a perfect score means every code area documented, every document linked into code and a
near-perfect ranker. Ninety is Doc Bridge's own A boundary; coverage and the 7+2 conformance
summaries stay exact, and an attestation still has to record the score that was measured, not the
floor.

Commit-mode attestations are squash-safe. The attested `commit` does not have to be an ancestor
of HEAD, because squash and rebase merges rewrite it. When that commit is still reachable, the
certified paths must be byte-identical between it and HEAD (an ancestor that differs is reported
as drift). When it is no longer reachable, for example after the feature branch is deleted, the
certified paths must still hash to the attested content digest. The digest is verified in every
case, so rebinding after a merge is not required.

The local mode is the only certification mode. It binds every payload to repository HEAD,
recomputes its content digest, validates the separate Doc Bridge artifact, executes live
`ak-docs doctor --json` and Documentation Standard v1 conformance in every root, and inspects
visual and contextual-link content. The artifact is a ledger, never the authority: live score,
coverage, and 7+2 summaries must match it and the payload. Updating an attestation requires
rerunning those checks, then refreshing its payload digest and artifact.
