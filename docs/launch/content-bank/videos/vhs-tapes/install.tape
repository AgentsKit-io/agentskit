# VHS tape — "Add agents to any existing project. Three packages."
# Shows how simple it is to add AgentsKit to an existing project.

Output install.gif
Output install.mp4

Set Theme "Dracula"
Set FontSize 16
Set Width 1200
Set Height 600
Set Padding 28
Set WindowBar Colorful
Set WindowBarSize 40
Set TypingSpeed 45ms

Hide
Type "mkdir demo && cd demo && npm init -y"
Enter
Sleep 1500ms
Type "clear"
Enter
Show

Sleep 400ms

Type "# Add AI agents to any project. Pick only what you need."
Enter
Sleep 1500ms

Type "npm install @agentskit/core @agentskit/adapters @agentskit/react"
Sleep 400ms
Enter

Sleep 6000ms
