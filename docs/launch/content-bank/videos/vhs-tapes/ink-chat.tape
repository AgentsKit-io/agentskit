# VHS tape — "Same agent, now in the terminal. Same API."
# Shows AgentsKit ink (terminal UI) — proves multi-surface capability.
#
# Setup: scaffold ink template first:
#   npx @agentskit/cli init --template ink --provider gemini --dir /tmp/ak-ink -y
#   cd /tmp/ak-ink && pnpm install
# Render from inside the project.
#
# Env required: GEMINI_API_KEY

Output ink-chat.gif
Output ink-chat.mp4

Set Theme "TokyoNight"
Set FontSize 15
Set Width 1100
Set Height 640
Set Padding 24
Set WindowBar Colorful
Set WindowBarSize 36
Set TypingSpeed 45ms

Hide
Type "clear"
Enter
Show

Sleep 400ms

Type "# Same agent API. Terminal UI instead of browser."
Enter
Sleep 1500ms

Type "pnpm dev"
Sleep 300ms
Enter

Sleep 3000ms

# --- Real question, not self-referential ---
Type "Explain the difference between agents and chatbots in one paragraph."
Sleep 300ms
Enter

Sleep 6000ms

Type "Now list 3 use cases where agents beat chatbots."
Sleep 300ms
Enter

Sleep 6000ms

Ctrl+C
Sleep 600ms
