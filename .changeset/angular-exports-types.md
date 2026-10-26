---
'@agentskit/angular': patch
---

Publish type declarations through the `exports` map (`types` condition first) so TypeScript consumers on `moduleResolution: bundler` or `node16` can resolve the package types.
