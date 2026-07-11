---
'@agentskit/react': patch
'@agentskit/ink': patch
---

Abort an active chat stream when the React or Ink `useChat` consumer unmounts, preventing orphaned model and tool execution.
