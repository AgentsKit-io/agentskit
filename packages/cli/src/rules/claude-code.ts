/**
 * Claude Code outputs split into two distinct surfaces:
 *
 *  - **Skill bundle** at `.claude/skills/agentskit/SKILL.md` — the
 *    Anthropic skill-spec file. Skills don't auto-register slash
 *    commands; they shape the conceptual capability the agent picks
 *    up when relevant.
 *
 *  - **Project-scoped slash commands** at `.claude/commands/*.md` —
 *    the actual `/<name>` invocations Claude Code surfaces in the
 *    palette. These live alongside (not inside) the skill bundle.
 *
 * Both are real Claude Code conventions; they live at different paths
 * and serve different purposes. Bundling slash commands inside a skill
 * folder (as an earlier draft did) silently produces files Claude
 * Code never reads.
 */

export interface ClaudeCodeFile {
  /** Path relative to the surface root. */
  path: string
  contents: string
}

export const CLAUDE_CODE_SKILL: ClaudeCodeFile[] = [
  {
    path: 'SKILL.md',
    contents: `---
name: agentskit
description: Scaffold AgentsKit projects, add tools/skills, run doctor, and inspect the runtime — wraps the agentskit CLI.
---

# AgentsKit

Skill bundle for working with the AgentsKit toolkit from inside Claude Code.

Pair this skill with the project-scoped slash commands at \`.claude/commands/agentskit-*.md\`:

- \`/agentskit-new-agent\` — interactive scaffold (\`agentskit init\`)
- \`/agentskit-doctor\` — diagnose the local environment (\`agentskit doctor\`)
- \`/agentskit-add-tool\` — add a tool integration template
- \`/agentskit-add-skill\` — add a skill template
- \`/agentskit-lint-pii\` — validate a PII taxonomy file
- \`/agentskit-rules\` — write \`.cursor/rules\` / \`.windsurfrules\` / Codex profile

When the user is inside an AgentsKit workspace, prefer the slash commands over
hand-rolling shell invocations — they share the canonical defaults.

For convention reminders (named exports only, no bare throw, etc.), read
\`AGENTS.md\` at the workspace root.
`,
  },
]

export const CLAUDE_CODE_SLASH_COMMANDS: ClaudeCodeFile[] = [
  {
    path: 'agentskit-new-agent.md',
    contents: `---
description: Scaffold a new AgentsKit project (interactive)
allowed-tools: Bash(npx agentskit init:*)
---

Run \`npx @agentskit/cli init\` interactively in the user's chosen directory.
After scaffold completes, summarise the layout (templates created, next
commands the user should run).
`,
  },
  {
    path: 'agentskit-doctor.md',
    contents: `---
description: Run the AgentsKit environment doctor and summarise findings
allowed-tools: Bash(npx agentskit doctor:*)
---

Run \`npx @agentskit/cli doctor\` in the workspace root. Format the output
into pass / warn / fail buckets and propose a fix for each fail / warn.
`,
  },
  {
    path: 'agentskit-add-tool.md',
    contents: `---
description: Add a tool template to the current package
---

Ask the user which tool to add. Use \`packages/templates/src/blueprints/tool.ts\`
to scaffold the file under \`packages/<pkg>/src/tools/\`. Update the package's
\`src/index.ts\` to re-export the new tool. Add a vitest mock test under
\`packages/<pkg>/tests/\`.
`,
  },
  {
    path: 'agentskit-add-skill.md',
    contents: `---
description: Add a skill template to @agentskit/skills
---

Use \`packages/templates/src/blueprints/skill.ts\` to scaffold a new skill
under \`packages/skills/src/\`. Re-export from the package index. Add a
golden-dataset test fixture under \`packages/skills/tests/\` (10–50 input/
expected examples, per the conventions).
`,
  },
  {
    path: 'agentskit-lint-pii.md',
    contents: `---
description: Validate a PII taxonomy JSON file
allowed-tools: Bash(npx agentskit pii lint:*)
---

Ask the user for a path. Run \`npx @agentskit/cli pii lint <path>\` and
display the report. If issues exist, suggest concrete fixes per the
issue messages.
`,
  },
  {
    path: 'agentskit-rules.md',
    contents: `---
description: Write editor rule files (Cursor / Windsurf / Codex / Claude Code)
allowed-tools: Bash(npx agentskit rules:*)
---

Ask which editor (or "all"). Run the matching:
- \`npx @agentskit/cli rules cursor\`
- \`npx @agentskit/cli rules windsurf\`
- \`npx @agentskit/cli rules codex\`
- \`npx @agentskit/cli rules claude-code\`

After writing, summarise which files landed and what each one does.
`,
  },
]
