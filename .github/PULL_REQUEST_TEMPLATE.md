<!-- Thanks for contributing! Please fill out this template. -->

## What

<!-- Brief description of the change. -->

## Why

<!-- What problem does this solve? Link to issue: Closes #NNN -->

## How

<!-- Implementation notes. Non-trivial design decisions, trade-offs, alternatives considered. -->

## Reuse

<!-- What existing @agentskit/* package, library, or service did you check or reuse? If this adds a new package, dependency, or hand-rolled code, say why nothing existing fit. -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (requires RFC reference below)
- [ ] Docs only
- [ ] Chore / internal

## RFC / ADR reference

<!-- If this is a breaking change or a new contract, link the RFC or ADR. -->

## Validation

- [ ] Every acceptance criterion has contract or edge-case test evidence (`pnpm test`)
- [ ] All applicable documented repository gates pass on this commit (including lint, test, build, and typecheck)
- [ ] Type check (`pnpm lint`)
- [ ] Bundle size within budget (`pnpm size` — when configured and bundle or export changes)
- [ ] Public API JSDoc updated and coverage passes — when public API or exports change
- [ ] Changeset created (`pnpm changeset`) — for any user-facing change
- [ ] Docs updated (concept page, recipe, or API reference)
- [ ] No tests disabled or skipped to pass a gate
- [ ] Generated artifacts regenerated with the repository's documented command — when applicable
- [ ] Manifesto principles respected (core <10KB, plug-and-play, zero lock-in, no `any`)
- [ ] Screenshots or demo recorded (for UI changes)

## Screenshots / demo

<!-- Optional but appreciated for UI or DX changes. -->
