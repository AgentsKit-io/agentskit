# VHS tape — "0 to running agent in 30 seconds"
# Shows npx init → install → running app. Speed is the feature.

Output init.gif
Output init.mp4

Set Theme "Dracula"
Set FontSize 16
Set Width 1200
Set Height 700
Set Padding 28
Set WindowBar Colorful
Set WindowBarSize 40
Set TypingSpeed 45ms

Hide
Type "clear"
Enter
Show

Sleep 400ms

Type "# From zero to running agent in 30 seconds."
Enter
Sleep 1500ms

# --- Init with react template ---
Type "npx @agentskit/cli init --template react --provider demo --dir my-agent -y"
Sleep 400ms
Enter

Sleep 4500ms

Type "cd my-agent && pnpm install --silent"
Enter
Sleep 4000ms

# --- Show what was generated ---
Type "cat src/App.tsx | head -20"
Enter
Sleep 3000ms

# --- Start it ---
Type "pnpm dev"
Enter
Sleep 5000ms
