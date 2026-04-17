# VHS Tapes — terminal GIFs

Scripted terminal recordings for AgentsKit demos. Rendered via [VHS](https://github.com/charmbracelet/vhs) → `.gif` + `.mp4`.

## What's here

| Tape | What it shows | Requires |
|------|---------------|----------|
| `install.tape` | `npm install @agentskit/*` | none |
| `init.tape` | `agentskit init --template react -y` end-to-end | npx + network |
| `doctor.tape` | `agentskit doctor` environment check | scratch project |
| `dev-hot-reload.tape` | `agentskit dev` with file edit + hot reload | scratch project |
| `chat-streaming.tape` | Basic streaming chat in the terminal | scratch project |
| `chat-tool-call.tape` | Chat with a tool call | scratch project |
| `ink-chat.tape` | `@agentskit/ink` chat interaction | scratch project |
| `tunnel.tape` | `agentskit tunnel --port 3000` | scratch project |
| `provider-swap-cli.tape` | `sed` flip from anthropic to openai, re-run chat | scratch project |
| `multi-agent.tape` | planner → researcher → writer delegation | `--template multi-agent` scaffold |
| `size-limit.tape` | `pnpm exec size-limit` report at repo root | run at repo root (not scratch) |

## Quick start

```bash
# install once
brew install vhs ffmpeg

# render everything (scaffolds scratch project at /tmp/agentskit-vhs-scratch)
./render.sh

# render one
./render.sh init doctor dev-hot-reload

# validate env, don't render
./render.sh --validate-only

# wipe scratch + outputs
./render.sh --clean
```

Outputs land in `./out/<name>.gif` + `.mp4`.

## How the script works

1. Checks prerequisites (vhs, ffmpeg, node, pnpm/npm, npx).
2. Scaffolds a scratch project at `/tmp/agentskit-vhs-scratch` via `npx @agentskit/cli@latest init --template react --provider demo -y`.
3. Installs its deps.
4. Validates that the installed CLI exposes: `init`, `doctor`, `dev`, `tunnel`, `chat`. Any missing → tapes that depend on it are skipped with a warning.
5. Renders each requested tape from inside the scratch project so relative commands resolve.
6. Moves `*.gif` and `*.mp4` into `./out/`.

## Troubleshooting

**`agentskit doctor` not found after init**

The currently-published `@agentskit/cli` may be missing the `doctor` subcommand. Check with:

```bash
./render.sh --validate-only
```

If doctor is flagged missing, either:
- Wait for the next cli publish (PR #323 in-flight fixes the npm publish pipeline).
- Install from git: `AGENTSKIT_CLI_VERSION=next ./render.sh` (requires a published `next` tag — not available today).
- Render only the tapes that work with the current CLI: `./render.sh init chat-streaming install`.

**VHS theme error — "invalid Set Theme"**

VHS theme names have no spaces: `TokyoNight` not `"Tokyo Night"`. See `vhs themes` for the full list.

**`Type "echo '\\"..."`" invalid command**

VHS can't nest quotes inside `Type`. Use a simple command with `sed -i.bak 's/foo/bar/'` instead, or write the file via `cat > file <<EOF`-style heredoc before starting VHS.

**Scratch project is stale**

```bash
./render.sh --clean
./render.sh
```

## Output

After `./render.sh`:

```
out/
├── init.gif             # ← Twitter, docs hero, landing
├── init.mp4             # ← higher-quality embed
├── doctor.gif
├── dev-hot-reload.gif
├── chat-streaming.gif
├── chat-tool-call.gif
├── ink-chat.gif
├── tunnel.gif
├── provider-swap-cli.gif
├── multi-agent.gif
└── install.gif
```

## Using the outputs

- **Twitter post:** GIF (≤15 MB) attached directly
- **agentskit.io docs:** MP4 `<video>` with GIF fallback
- **Blog posts (dev.to, Hashnode):** GIF embedded
- **Product Hunt gallery:** use PNG captures from the `ph-gallery/` folder, not GIFs (PH prefers static)
- **README on GitHub:** GIF (GitHub auto-plays animated GIFs)
