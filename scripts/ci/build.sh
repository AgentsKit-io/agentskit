#!/usr/bin/env bash
# CI build stage: build, publication contracts and Doc Bridge gates.
# BASE_REF (pull requests only) is the base commit SHA set by the pipeline.
set -euo pipefail

run_all=true
if [[ -n "${BASE_REF:-}" && "${GITHUB_HEAD_REF:-}" != "changeset-release/main" ]] \
  && ! git diff --name-only "$BASE_REF"...HEAD | grep -Eq '^(package\.json|pnpm-lock\.yaml|tsconfig[^/]*|vitest\.shared\.ts|turbo\.json|scripts/|\.github/)'; then
  run_all=false
fi

pnpm exec turbo run build --filter='./packages/*' --concurrency=2

if [[ "$run_all" == false ]]; then
  plan="${RUNNER_TEMP:-/tmp}/packed-consumers-build-plan.json"
  pnpm exec turbo run build --filter="...[$BASE_REF]" --dry=json > "$plan"
  export PACKED_CONSUMERS_BUILD_PLAN="$plan"
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
