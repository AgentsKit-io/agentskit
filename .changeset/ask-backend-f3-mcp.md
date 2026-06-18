---
---

Add a read-only MCP endpoint (`/mcp`) to the central Ask backend (RFC-0007 F3): JSON-RPC over POST exposing `list_corpora`, `search_docs`, and `ask` over the shared corpus registry. The `ask` tool reuses the warm ask handler and collapses its streamed `UiEvent` output into a single cited answer.
