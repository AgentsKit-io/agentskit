#!/usr/bin/env bash
# Scripted output that mimics `agentskit init` for demos.
# Used by demo/init.tape to produce a deterministic GIF.

set -e

FOAM='\033[38;2;230;237;243m'
BLUE='\033[38;2;88;166;255m'
GREEN='\033[38;2;46;160;67m'
DIM='\033[38;2;139;148;158m'
RESET='\033[0m'
BOLD='\033[1m'

type_line() {
  printf "%b\n" "$1"
  sleep "${2:-0.15}"
}

step() {
  printf "  ${BLUE}◈${RESET} ${DIM}%s${RESET} %b\n" "$1" "$2"
  sleep 0.35
}

clear
type_line "" 0.2
type_line "${FOAM}Welcome to ${BOLD}AgentsKit${RESET}${FOAM} — let's scaffold your project.${RESET}" 0.4
type_line ""

step "Project name:       " "${FOAM}my-agent${RESET}"
step "Template:           " "${FOAM}react ${DIM}(React + Vite)${RESET}"
step "Provider:           " "${FOAM}openai${RESET}"
step "Tools:              " "${FOAM}web-search, fs${RESET}"
step "Memory:             " "${FOAM}file${RESET}"
step "Package manager:    " "${FOAM}pnpm${RESET}"

type_line ""
type_line "  ${DIM}Scaffolding…${RESET}" 0.3
type_line "  ${GREEN}✓${RESET} Created ${FOAM}my-agent/${RESET}"
type_line "  ${GREEN}✓${RESET} Installed 14 packages (5.17 KB core)"
type_line "  ${GREEN}✓${RESET} Wired ${FOAM}openaiAdapter${RESET} + ${FOAM}fileChatMemory${RESET}"
type_line "  ${GREEN}✓${RESET} Added ${FOAM}web-search${RESET} and ${FOAM}fs${RESET} tools"
type_line ""
type_line "  ${BOLD}${FOAM}Done.${RESET} Next:"
type_line ""
type_line "    ${DIM}cd${RESET} my-agent"
type_line "    ${DIM}pnpm${RESET} dev"
type_line ""
