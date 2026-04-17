# VHS tape — "Expose your local agent to the internet. One command."
# Shows tunnel for webhooks and sharing.

Output tunnel.gif
Output tunnel.mp4

Set Theme "Dracula"
Set FontSize 15
Set Width 1100
Set Height 560
Set Padding 24
Set WindowBar Colorful
Set WindowBarSize 36
Set TypingSpeed 45ms

Hide
Type "clear"
Enter
Show

Sleep 400ms

Type "# Share your local agent with anyone. Public URL in 3 seconds."
Enter
Sleep 1500ms

Type "npx @agentskit/cli tunnel --port 3000"
Sleep 400ms
Enter

Sleep 5000ms

Ctrl+C
Sleep 400ms
