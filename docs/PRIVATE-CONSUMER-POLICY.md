# Private consumer confidentiality policy

AgentsKit can learn from private consumers without publishing how those products work.

## Allowed public evidence

- independently written, product-neutral requirements;
- published AgentsKit API analysis;
- public provider documentation;
- synthetic examples and fixtures;
- compatibility, security, performance, and recovery criteria;
- anonymized adoption outcomes with explicit publication approval.

## Prohibited public evidence

- private repository paths, symbols, schemas, prompts, source, or dependency names;
- private issues, commits, screenshots, logs, telemetry, or fixtures;
- descriptions of private flows, states, permissions, integrations, topology, or business rules;
- copied or mechanically translated private code;
- claims whose only support is confidential implementation knowledge.

## Required workflow

1. Review the private consumer in a confidential context.
2. Restate the need as a product-neutral requirement without private identifiers.
3. Verify whether a published AgentsKit contract already owns it.
4. Write the public issue using only public sources and synthetic examples.
5. Implement and test the public contract independently.
6. Scan the diff and reachable Git history for private identifiers and derived details.
7. Adopt the supported public release in the private consumer through a separately reviewed change.

## Incident response

If private detail reaches a public artifact:

1. stop publication and remove active references;
2. rewrite affected feature-branch refs where safe;
3. inspect pull-request refs and direct object reachability;
4. contact GitHub Support when server-side object or cache purge is required;
5. audit related issues, comments, docs, fixtures, and generated artifacts;
6. record only the remediation and generic guardrail publicly, never repeat the private content.

History removal and provider-side purge are separate completion gates. A clean current diff alone does not close a disclosure incident.
