#!/usr/bin/env bash
# CI lint-stage static checks: commit messages, changeset, typecheck of the packages.
# BASE_REF (pull requests only) is the base commit SHA set by the pipeline.
set -euo pipefail

if [[ -n "${BASE_REF:-}" && "${GITHUB_HEAD_REF:-}" != "changeset-release/main" ]]; then
  pnpm exec commitlint --from="$BASE_REF" --to=HEAD --verbose

  changed=$(git diff --name-only "$BASE_REF"...HEAD)
  echo "Changed files:"
  echo "$changed"
  # Skip when the PR only touches docs/examples or package metadata.
  needs=$(echo "$changed" | grep -E '^packages/' | grep -vE '^packages/[^/]+/(tests?/|.*\.(test|spec)\.[^/]+$|package\.json$|.*\.md$)' || true)
  if [[ -z "$needs" ]]; then
    echo "No changes inside packages/: changeset not required."
  else
    echo "Package changes detected. Verifying changeset exists..."
    pnpm changeset status --since="$BASE_REF"
  fi
fi

if [[ -z "${BASE_REF:-}" || "${GITHUB_HEAD_REF:-}" == "changeset-release/main" ]]; then
  pnpm exec turbo run lint --filter="./packages/*"
elif git diff --name-only "$BASE_REF"...HEAD | grep -Eq '^(package\.json|pnpm-lock\.yaml|tsconfig[^/]*|vitest\.shared\.ts|turbo\.json|scripts/|\.github/)'; then
  pnpm exec turbo run lint --filter="./packages/*"
else
  pnpm exec turbo run lint --filter="...[$BASE_REF]"
fi
