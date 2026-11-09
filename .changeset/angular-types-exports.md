---
'@agentskit/angular': patch
---

fix: publish type declarations through the package `exports` map (`types` condition) so TypeScript consumers using `moduleResolution: bundler` or `node16` resolve them.
