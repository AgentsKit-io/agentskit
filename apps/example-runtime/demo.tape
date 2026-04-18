# VHS tape for generating runtime agent demo GIF
# Install VHS: https://github.com/charmbracelet/vhs
# Run: vhs demo.tape

Output apps/docs-next/public/demos/runtime-agent.gif

Set FontSize 14
Set Width 800
Set Height 400
Set Theme "Catppuccin Mocha"

Type "pnpm --filter @agentskit/example-runtime dev"
Enter
Sleep 3s
