# ADR 0033 — Registry adopts the ecosystem shell

- **Status**: Proposed, pending visual review
- **Date**: 2026-09-25
- **Related ADRs**: ADR 0029

## Context

Registry already uses Fumadocs for its local navigation and a generated script
for the ecosystem bar and interactive tour. Its homepage still had a separate
cursor effect and footer layout, so the family of sites did not read as one
product system.

## Decision

Use the generated ecosystem asset for the six-product bar and tour, with Registry
selected. Keep Fumadocs responsible for the local header, search, theme, and
mobile menu. Adopt the AgentsKit aurora shader on Registry's homepage with the
Registry blue accent and replace its cursor effect. Align the Registry footer's
layout and glass treatment with AgentsKit while highlighting only the current
product link. Documentation pages retain solid reading surfaces.

The Registry-specific content stays in Registry. This change does not create a
cross-repository package or change the documentation shell.
