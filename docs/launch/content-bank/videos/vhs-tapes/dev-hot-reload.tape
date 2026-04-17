# VHS tape — "Edit code, agent reloads. Instant feedback loop."
# Shows agentskit dev with hot-reload.
#
# Setup: scaffold runtime project first:
#   npx @agentskit/cli init --template runtime --provider demo --dir /tmp/ak-dev -y
#   cd /tmp/ak-dev && pnpm install
# Render from inside the project.

Output dev-hot-reload.gif
Output dev-hot-reload.mp4

Set Theme "Dracula"
Set FontSize 15
Set Width 1200
Set Height 700
Set Padding 28
Set WindowBar Colorful
Set WindowBarSize 38
Set TypingSpeed 40ms

Hide
Type "clear"
Enter
Show

Sleep 400ms

Type "# Edit code → agent reloads instantly. No restart needed."
Enter
Sleep 1500ms

Type "npx @agentskit/cli dev"
Enter
Sleep 6000ms

# In a real recording, edit src/index.ts in another terminal to trigger reload
Sleep 4000ms

Ctrl+C
Sleep 600ms
