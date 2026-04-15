# VHS tape — regenerates apps/docs-next/public/demo-init.gif
# Run: vhs demo/init.tape
# Docs: https://github.com/charmbracelet/vhs

Output apps/docs-next/public/demo-init.gif

Set Shell   "bash"
Set FontSize   16
Set Width      920
Set Height     520
Set Padding    24
Set Theme      { "name": "AgentsKit", "black": "#0D1117", "red": "#F85149", "green": "#2EA043", "yellow": "#D29922", "blue": "#58A6FF", "magenta": "#A371F7", "cyan": "#39C5CF", "white": "#E6EDF3", "brightBlack": "#6E7681", "brightRed": "#F85149", "brightGreen": "#2EA043", "brightYellow": "#D29922", "brightBlue": "#58A6FF", "brightMagenta": "#A371F7", "brightCyan": "#39C5CF", "brightWhite": "#E6EDF3", "background": "#0D1117", "foreground": "#E6EDF3", "cursor": "#E6EDF3", "selection": "#21262D" }
Set TypingSpeed 60ms
Set PlaybackSpeed 1.0

# Clean prompt (no user@host clutter)
Hide
Type "export PS1='\033[38;2;88;166;255m$\033[0m '"
Enter
Type "clear"
Enter
Show

Sleep 500ms

# The star of the show
Type "npx @agentskit/cli init"
Sleep 800ms
Enter

Sleep 400ms

# Our scripted output runs — pretend npx just fetched the CLI
Hide
Type "bash demo/fake-init.sh"
Enter
Show

Sleep 5s

Type "cd my-agent && pnpm dev"
Sleep 600ms
Enter
Sleep 400ms

Hide
Type "printf '\n  \033[38;2;88;166;255m▲\033[0m ready at \033[38;2;88;166;255mhttp://localhost:5173\033[0m\n\n  \033[38;2;139;148;158m→ \"Summarize the AgentsKit manifesto\"\033[0m\n  \033[38;2;46;160;67m● streaming response in 340ms\033[0m\n'"
Enter
Show

Sleep 3.5s
