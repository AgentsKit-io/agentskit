# VHS tape — "Switch providers in one flag. Zero lock-in."
# Shows the same task running on different providers — proves zero lock-in.
#
# Env required: GEMINI_API_KEY

Output provider-swap-cli.gif
Output provider-swap-cli.mp4

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

Type "# Same task, different providers. One flag changes everything."
Enter
Sleep 1500ms

# --- Run with Gemini ---
Type "npx @agentskit/cli run 'What is 42 * 7?' --provider gemini"
Sleep 300ms
Enter
Sleep 8000ms

# --- Run with demo (offline, no API key) ---
Type "npx @agentskit/cli run 'What is 42 * 7?' --provider demo"
Sleep 300ms
Enter
Sleep 4000ms

# --- Show the point ---
Type "# Same code. Same API. Swap one flag."
Enter
Sleep 2000ms
