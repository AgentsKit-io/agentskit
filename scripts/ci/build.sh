#!/usr/bin/env bash
# CI build stage: build, publication contracts and Doc Bridge gates.
# BASE_REF (pull requests only) is the base commit SHA set by the pipeline.
set -euo pipefail

run_all=true
if [[ -n "${BASE_REF:-}" && "${GITHUB_HEAD_REF:-}" != "changeset-release/main" ]]; then
  # The build job checks out shallowly: make sure the base commit exists so the
  # diff and the turbo --filter=[$BASE_REF] below can resolve it.
  git cat-file -e "$BASE_REF^{commit}" 2>/dev/null \
    || git fetch --no-tags --depth=1 origin "$BASE_REF" 2>/dev/null || true
  # Fail closed: any failure computing the diff keeps run_all=true.
  if changed="$(git diff --name-only "$BASE_REF" HEAD 2>/dev/null)" \
    && ! grep -Eq '^(package\.json|pnpm-lock\.yaml|tsconfig[^/]*|vitest\.shared\.ts|turbo\.json|scripts/|\.github/)' <<<"$changed"; then
    run_all=false
  fi
fi

if [[ "$run_all" == false ]]; then
  # Affected build (packages and apps), as the previous CI did.
  pnpm exec turbo run build --filter="...[$BASE_REF]" --concurrency=2
  plan="${RUNNER_TEMP:-/tmp}/packed-consumers-build-plan.json"
  pnpm exec turbo run build --filter="...[$BASE_REF]" --dry=json > "$plan"
  export PACKED_CONSUMERS_BUILD_PLAN="$plan"
else
  pnpm exec turbo run build --filter='./packages/*' --concurrency=2
fi

pnpm check:publication-surface
pnpm check:packed-consumers
pnpm check:publish-manifests
pnpm check:public-api-snapshot

# PRs need the current tree's index for documentation gates.
pnpm docs:bridge:index
pnpm check:quality-gates
pnpm docs:bridge:freshness
pnpm docs:bridge:gate
pnpm docs:bridge:conformance
