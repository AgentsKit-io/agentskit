# VHS tape — "AI agent with tool calling — searches the web, asks permission"
# Shows the killer feature: agents that use tools autonomously.
# Uses Gemini free tier (supports tool calling).
#
# Env required: GEMINI_API_KEY

Output chat-tool-call.gif
Output chat-tool-call.mp4

Set Theme "Dracula"
Set FontSize 15
Set Width 1100
Set Height 720
Set Padding 24
Set WindowBar Colorful
Set WindowBarSize 36
Set TypingSpeed 50ms

Hide
Type "clear"
Enter
Show

Sleep 400ms

# --- Show the command: chat + tools in one flag ---
Type "# Chat with tools: web search enabled in one flag"
Enter
Sleep 1200ms

Type "npx @agentskit/cli chat --provider gemini --tools web_search"
Sleep 400ms
Enter

Sleep 2500ms

# --- Real task that triggers tool calling ---
Type "What was the mass shooting (July 13, 2024) that happened while Trump was speaking?"
Sleep 300ms
Enter

Sleep 12000ms

# --- Follow-up to show memory works ---
Type "Who was the shooter?"
Sleep 300ms
Enter

Sleep 8000ms

Ctrl+C
Sleep 400ms
