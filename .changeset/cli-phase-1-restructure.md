---
"@agentskit/cli": patch
---

Internal restructure (Phase 1 of ARCHITECTURE.md plan). Split `commands.ts` into `commands/{chat,run,init,doctor,config,dev,tunnel}.ts` and extracted `chat.tsx` into `app/ChatApp.tsx` plus `runtime/{use-runtime,use-tool-permissions,use-session-meta}.ts`. Public API unchanged; old paths remain as deprecated re-exports.
