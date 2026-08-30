# AgentsKit MCP — installation guide for coding agents

Use Node.js 20+ and launch the published server over stdio with the smallest
default tool set:

```bash
npx -y @agentskit/mcp@0.4.2 --tools fetch,search
```

The process is an MCP JSON-RPC server. Keep stdout connected to the MCP host;
diagnostic messages are written to stderr. The default tools are `fetch_url` and
`web_search`.

Do not enable privileged tools in an automatic setup. `filesystem` requires
`--fs-root <dir>`, `sqlite` requires `--sqlite <file>`, and `shell` requires
`--allow-shell`; each should be enabled only after the user supplies an
explicit scope or permission.

After launch, the host should complete `initialize`, call `tools/list`, and
show `fetch_url` and `web_search`. A provider API key is not required for this
basic fetch/search profile; agent-backed tools use a separate `--agents` path
and require the provider configuration documented in the package README.
