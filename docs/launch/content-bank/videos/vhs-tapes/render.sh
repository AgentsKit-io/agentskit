#!/usr/bin/env bash
# VHS tape runner — setup, validate, render every tape in this folder
#
# Usage:
#   ./render.sh                    # render all tapes
#   ./render.sh init doctor        # render specific tapes (basename without .tape)
#   ./render.sh --validate-only    # check prerequisites, don't render
#   ./render.sh --clean            # remove the scratch project and output
#
# Output lives in ./out/<tape-name>.gif + .mp4

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$HERE/out"
SCRATCH_BASE="${AGENTSKIT_SCRATCH:-/tmp/agentskit-vhs}"
CLI_VERSION="${AGENTSKIT_CLI_VERSION:-latest}"
GEMINI_KEY="${GEMINI_API_KEY:-}"

# which template each tape needs (default: runtime)
tape_template() {
  case "$1" in
    init)               echo "react" ;;
    ink-chat)           echo "ink" ;;
    multi-agent)        echo "multi-agent" ;;
    chat-streaming)     echo "none" ;;
    chat-tool-call)     echo "none" ;;
    install)            echo "none" ;;
    size-limit)         echo "none" ;;
    *)                  echo "runtime" ;;
  esac
}

c_green() { printf '\033[32m%s\033[0m\n' "$*"; }
c_red() { printf '\033[31m%s\033[0m\n' "$*"; }
c_yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
c_blue() { printf '\033[36m%s\033[0m\n' "$*"; }

step() { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------

check_prereqs() {
  step "Checking prerequisites"

  local fail=0

  if ! command -v vhs >/dev/null 2>&1; then
    c_red "✗ vhs not found"
    echo "  install: brew install vhs   # or: npm i -g @charmbracelet/vhs"
    fail=1
  else
    c_green "✓ vhs $(vhs --version 2>/dev/null | head -1)"
  fi

  if ! command -v ffmpeg >/dev/null 2>&1; then
    c_yellow "⚠ ffmpeg not found — VHS needs it for mp4 output"
    echo "  install: brew install ffmpeg"
    fail=1
  else
    c_green "✓ ffmpeg"
  fi

  if ! command -v node >/dev/null 2>&1; then
    c_red "✗ node not found"
    fail=1
  else
    c_green "✓ node $(node -v)"
  fi

  if ! command -v pnpm >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
    c_red "✗ neither pnpm nor npm found"
    fail=1
  else
    command -v pnpm >/dev/null 2>&1 && c_green "✓ pnpm $(pnpm -v)"
    command -v npm >/dev/null 2>&1 && c_green "✓ npm $(npm -v)"
  fi

  if ! command -v npx >/dev/null 2>&1; then
    c_red "✗ npx not found"
    fail=1
  else
    c_green "✓ npx"
  fi

  [[ $fail -eq 0 ]] || {
    c_red "\nInstall missing tools and re-run."
    exit 1
  }
}

# ---------------------------------------------------------------------------
# Scratch project — one-shot scaffold, reused across tapes
# ---------------------------------------------------------------------------

# scaffold one template into $SCRATCH_BASE/<template>/
scaffold_template() {
  local tmpl="$1"
  local dir="$SCRATCH_BASE/$tmpl"
  local provider="gemini"

  # use demo provider if no Gemini key
  [[ -z "$GEMINI_KEY" ]] && provider="demo"

  if [[ -d "$dir" && -f "$dir/package.json" ]]; then
    c_blue "  $tmpl already scaffolded — reusing"
    return
  fi

  rm -rf "$dir"

  c_blue "  Scaffolding --template $tmpl --provider $provider ..."
  npx "@agentskit/cli@$CLI_VERSION" init \
    --template "$tmpl" \
    --provider "$provider" \
    --dir "$dir" \
    -y 2>&1 || true

  # flatten if init created a subdir
  if [[ ! -f "$dir/package.json" ]]; then
    for sub in "$dir"/*/; do
      if [[ -f "${sub}package.json" ]]; then
        cp -a "${sub}"* "${sub}".[!.]* "$dir/" 2>/dev/null || true
        rm -rf "$sub"
        break
      fi
    done
  fi

  # write .env with Gemini key if available
  if [[ -n "$GEMINI_KEY" && "$provider" == "gemini" ]]; then
    echo "GOOGLE_GENERATIVE_AI_API_KEY=$GEMINI_KEY" > "$dir/.env"
  fi

  # install deps
  (
    cd "$dir"
    if command -v pnpm >/dev/null 2>&1; then
      pnpm install --silent 2>/dev/null || true
    else
      npm install --silent 2>/dev/null || true
    fi
  )

  c_green "  ✓ $tmpl ready at $dir"
}

setup_scratch() {
  step "Setting up scratch projects at $SCRATCH_BASE"

  # collect unique templates needed (bash 3 compat — use a string list)
  local needed=""
  local tapes_to_build="$*"

  # if no specific tapes, scan all
  if [[ -z "$tapes_to_build" ]]; then
    shopt -s nullglob
    for t in "$HERE"/*.tape; do
      tapes_to_build="$tapes_to_build $(basename "$t" .tape)"
    done
    shopt -u nullglob
  fi

  for name in $tapes_to_build; do
    local tmpl
    tmpl="$(tape_template "$name")"
    [[ "$tmpl" == "none" ]] && continue
    # deduplicate
    case " $needed " in
      *" $tmpl "*) ;;
      *) needed="$needed $tmpl" ;;
    esac
  done

  mkdir -p "$SCRATCH_BASE"

  for tmpl in $needed; do
    scaffold_template "$tmpl"
  done

  c_green "✓ All scratch projects ready"
}

# resolve which scratch dir a tape should run in
scratch_dir_for() {
  local name="$1"
  local tmpl="$(tape_template "$name")"
  if [[ "$tmpl" == "none" ]]; then
    echo "/tmp"
  else
    echo "$SCRATCH_BASE/$tmpl"
  fi
}

# ---------------------------------------------------------------------------
# Validation of the installed CLI (guards against old npm versions)
# ---------------------------------------------------------------------------

validate_cli() {
  step "Validating @agentskit/cli via npx"

  local ok=0
  local missing=()
  mkdir -p "$OUT_DIR"

  for sub in init doctor dev tunnel chat; do
    if npx "@agentskit/cli@$CLI_VERSION" "$sub" --help >/dev/null 2>&1; then
      c_green "✓ npx @agentskit/cli $sub"
      ok=$((ok + 1))
    else
      c_yellow "⚠ npx @agentskit/cli $sub — NOT available"
      missing+=("$sub")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    c_yellow "\nSome subcommands are missing. Tapes that depend on them will be skipped."
    c_yellow "Fix: wait for the next @agentskit/cli publish."
    printf 'MISSING_CMDS=%s\n' "${missing[*]}" > "$OUT_DIR/.validation"
  fi
}

# ---------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------

render_one() {
  local tape_path="$1"
  local name
  name="$(basename "$tape_path" .tape)"

  step "Rendering $name"

  # skip if its required subcommand is missing
  if [[ -f "$OUT_DIR/.validation" ]]; then
    local missing
    missing="$(grep -E '^MISSING_CMDS=' "$OUT_DIR/.validation" | cut -d= -f2-)"
    for sub in $missing; do
      if grep -q "@agentskit/cli $sub" "$tape_path"; then
        c_yellow "⚠ Skipping $name — depends on missing \`agentskit $sub\`"
        return
      fi
    done
  fi

  # pick the right scratch dir for this tape
  local work_dir
  work_dir="$(scratch_dir_for "$name")"

  c_blue "  Running in $work_dir"

  # run VHS from the template's scratch dir
  (
    cd "$work_dir"
    vhs "$tape_path"
  )

  # move outputs to out/ with correct name
  shopt -s nullglob
  for f in "$work_dir"/*.gif "$work_dir"/*.mp4; do
    mv "$f" "$OUT_DIR/$(basename "$f")"
  done
  shopt -u nullglob

  c_green "✓ Rendered $name"
}

render_all() {
  local tapes=()
  if [[ $# -gt 0 ]]; then
    for name in "$@"; do
      tapes+=("$HERE/$name.tape")
    done
  else
    shopt -s nullglob
    for t in "$HERE"/*.tape; do
      tapes+=("$t")
    done
    shopt -u nullglob
  fi

  step "Rendering ${#tapes[@]} tape(s) → $OUT_DIR"
  mkdir -p "$OUT_DIR"

  for t in "${tapes[@]}"; do
    if [[ ! -f "$t" ]]; then
      c_red "✗ Tape not found: $t"
      continue
    fi
    render_one "$t"
  done

  step "All done. Outputs:"
  ls -la "$OUT_DIR"/*.gif "$OUT_DIR"/*.mp4 2>/dev/null || c_yellow "No outputs produced."
}

clean() {
  step "Cleaning scratch + outputs"
  rm -rf "$SCRATCH_BASE" "$OUT_DIR"
  c_green "✓ Cleaned"
}

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

case "${1:-}" in
  --help|-h)
    head -16 "$0" | tail -12 | sed 's/^# //;s/^#//'
    exit 0
    ;;
  --validate-only)
    check_prereqs
    setup_scratch "$@"
    validate_cli
    exit 0
    ;;
  --clean)
    clean
    exit 0
    ;;
  --setup-only)
    check_prereqs
    setup_scratch
    validate_cli
    exit 0
    ;;
  *)
    check_prereqs
    setup_scratch "$@"
    validate_cli || true
    render_all "$@"
    ;;
esac
