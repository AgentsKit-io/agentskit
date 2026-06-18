---
"@agentskit/ink": patch
---

Fix `createProgressObserver`: the stage-duration segment (e.g. `(1.2s)`) carried raw ANSI escape codes even in `plain` mode, leaving `\x1b[2m…\x1b[0m` in non-TTY/CI logs. The duration now uses the same plain-aware codes as the rest of the line.
