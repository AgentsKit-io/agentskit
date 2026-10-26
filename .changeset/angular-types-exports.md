---
'@agentskit/angular': patch
---

Publish type declarations through the package `exports` map (`types` condition first) so TypeScript consumers using `moduleResolution: bundler` or `node16`/`NodeNext` resolve them.
