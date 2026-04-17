# VHS tape — "Full AI agent with streaming in one command"
# Hero demo: shows AgentsKit running a real task with streaming output.
# Uses Gemini free tier (tool calling supported).
#
# Env required: GEMINI_API_KEY

Output chat-streaming.gif
Output chat-streaming.mp4

Set Theme "Dracula"
Set FontSize 15
Set Width 1100
Set Height 700
Set Padding 24
Set WindowBar Colorful
Set WindowBarSize 36
Set TypingSpeed 50ms

Hide
Type "clear"
Enter
Show

Sleep 500ms

# --- Demo 1: one-liner agent task ---
Type "# One command. Real AI agent. Streaming output."
Enter
Sleep 1500ms

Type "npx @agentskit/cli run 'List the top 3 JavaScript frameworks for building AI agents in 2026. For each, give one strength and one weakness.' --provider gemini --verbose"
Sleep 400ms
Enter

Sleep 18000ms

# --- Demo 2: same agent, different task ---
Type "npx @agentskit/cli run 'Write a haiku about open source software.' --provider gemini"
Sleep 400ms
Enter

Sleep 10000ms
