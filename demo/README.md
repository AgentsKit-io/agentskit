# Demo assets

Generates `apps/docs-next/public/demo-init.gif` — the `agentskit init` demo used in the docs, blog post, and social launches.

Uses [Charmbracelet VHS](https://github.com/charmbracelet/vhs) — declarative, repeatable, no manual recording.

## One-time install

```bash
brew install vhs ttyd        # macOS
# or: go install github.com/charmbracelet/vhs@latest
```

## Regenerate the GIF

```bash
vhs demo/init.tape
```

Output: `apps/docs-next/public/demo-init.gif`

That's it. Edit `demo/init.tape` to change pacing, add steps, or swap the scripted output at `demo/fake-init.sh`.

## Why scripted output?

`demo/fake-init.sh` mimics what `agentskit init` will print once the CLI is polished. Using a scripted version means:

- No network download during the recording (no flaky `npx` fetch)
- Deterministic frame timing (presentation-ready)
- We can record before the real flow is finalized

When the real CLI is stable, swap the `bash demo/fake-init.sh` line in `init.tape` for the actual `agentskit init` command.

## Files

- `init.tape` — the VHS recipe (typing, timing, theme)
- `fake-init.sh` — scripted CLI output used during the demo
