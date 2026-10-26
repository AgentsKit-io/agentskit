---
'@agentskit/angular': patch
---

Publish type declarations through `package.json` `exports` (`types` condition first) so TypeScript consumers on `moduleResolution: bundler` or `node16` resolve the package types.
