# VHS tape for generating ink example demo GIF
# Install VHS: https://github.com/charmbracelet/vhs
# Run: vhs demo.tape

Output apps/docs-next/public/demos/ink-chat.gif

Set FontSize 14
Set Width 800
Set Height 500
Set Theme "Catppuccin Mocha"

Type "pnpm --filter @agentskit/example-ink dev"
Enter
Sleep 2s
Type "What time is it?"
Enter
Sleep 3s
Type "Tell me more"
Enter
Sleep 3s
