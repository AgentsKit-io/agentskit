# VHS tape — "14 packages. Core under 10KB. Every one under budget."
# Technical authority demo: shows bundle size discipline.
# Run from repo root.

Output size-limit.gif
Output size-limit.mp4

Set Theme "Dracula"
Set FontSize 14
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

Type "# 14 packages. Every single one under budget."
Enter
Sleep 1500ms

Type "pnpm exec size-limit"
Sleep 400ms
Enter

Sleep 8000ms

Type "# Core: under 10KB gzipped. That's a promise, not a goal."
Enter
Sleep 2000ms
