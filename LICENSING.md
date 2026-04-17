# Licensing Decision

AgentsKit.js is released under the **MIT License** (see [LICENSE](./LICENSE)).  
Copyright (c) 2026 Emerson Braun.

---

## Why MIT?

MIT is the de facto standard for open-source JavaScript/TypeScript tooling. It was chosen because:

- **Permissive by design.** It imposes the smallest possible friction on adoption. Any developer, team, or company can use AgentsKit.js without legal review blocking them.
- **Ecosystem compatibility.** The vast majority of the JS/TS ecosystem (React, Vite, TypeScript itself, Vitest, etc.) uses MIT. A different license would create a mismatch in dependency graphs and compliance audits.
- **Commercial use is explicitly allowed.** Companies building products on top of AgentsKit.js owe us nothing but attribution in their `LICENSE` file. We earn our place through quality, not legal obligation.
- **No copyleft contagion.** GPL or LGPL would require downstream users to open-source their own code in specific circumstances. That conflicts directly with our goal of being the foundation businesses build on.

---

## What it means for users

You can:

- Use AgentsKit.js in commercial products, SaaS applications, internal tools, and proprietary software.
- Modify, fork, sublicense, and redistribute any package.
- Bundle AgentsKit.js into closed-source products.

You must:

- Include the original copyright notice and the MIT license text in any substantial redistribution of AgentsKit.js source code.

You do not need to:

- Open-source your application.
- Pay royalties or fees.
- Request permission.

---

## What it means for contributors

By submitting a pull request or patch to any package in this repository, contributors agree that their contributions are licensed under the same MIT License. There is no Contributor License Agreement (CLA) beyond this implicit grant. Contributions become part of the project under the existing copyright and license terms.

---

## Dependency license policy

Every dependency introduced into any AgentsKit.js package must carry a license that is compatible with MIT for commercial use. Acceptable licenses are:

| License | Allowed |
|---|---|
| MIT | Yes |
| BSD-2-Clause / BSD-3-Clause | Yes |
| Apache-2.0 | Yes (compatible with MIT in practice) |
| ISC | Yes |
| CC0-1.0 | Yes |
| GPL / LGPL / AGPL | **No** |
| SSPL | **No** |
| Commons Clause variants | **No** |
| Proprietary / unlicensed | **No** |

This policy applies to all direct and transitive runtime dependencies. Dev-only dependencies (test runners, build tools) are exempt from this restriction but should still use a permissive license wherever possible.

When adding a new dependency, verify its license via `npm info <package> license` or the package's `LICENSE` file before merging.

---

## Alignment with the Manifesto

Manifesto principle **4 — Zero lock-in** states:

> Leaving AgentsKit.js must be a single `npm uninstall` away. No proprietary formats, no captive state, no hidden coupling.

MIT is the legal expression of this principle. A restrictive license would create lock-in through legal obligation rather than product value. By choosing MIT, we ensure that the only reason users stay is because AgentsKit.js is genuinely useful — not because switching carries legal risk.

Manifesto principle **10 — Open by default** extends this to our governance: the license, this decision document, the roadmap, and all RFCs are public. Transparency at every layer.

---

*This document records the licensing decision for the project. It is not legal advice. For legal questions about your specific use case, consult a qualified attorney.*
