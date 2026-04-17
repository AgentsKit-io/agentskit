# VHS tape — "3 agents collaborate: planner → researcher → writer"
# Shows multi-agent orchestration with delegation.
#
# Setup: scaffold multi-agent template first:
#   npx @agentskit/cli init --template multi-agent --provider gemini --dir /tmp/ak-multi -y
#   cd /tmp/ak-multi && pnpm install
# Render from inside the project.
#
# Env required: GEMINI_API_KEY

Output multi-agent.gif
Output multi-agent.mp4

Set Theme "Dracula"
Set FontSize 15
Set Width 1200
Set Height 760
Set Padding 28
Set WindowBar Colorful
Set WindowBarSize 38
Set TypingSpeed 40ms

Hide
Type "clear"
Enter
Show

Sleep 400ms

Type "# Multi-agent: planner delegates to researcher and coder"
Enter
Sleep 1500ms

# --- Show the code briefly ---
Type "cat src/index.ts | head -25"
Enter
Sleep 4000ms

# --- Run it ---
Type "pnpm dev"
Sleep 400ms
Enter

Sleep 15000ms
