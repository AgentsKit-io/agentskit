---
'@agentskit/rag': minor
---

Add `@agentskit/rag/markdown`: pure helpers for Markdown notes — YAML frontmatter (`splitFrontmatter`, never throws), `[[wikilinks]]` with headings, aliases and escaped pipes (`extractWikilinks`, `stripWikilinks`), fence-aware heading sections (`sections`, `findSection`), GitHub tables (`parseTable`) and `parseNote`. The root entry is unchanged; `yaml` is only loaded by the new subpath.
