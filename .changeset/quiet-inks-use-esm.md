---
'@agentskit/ink': patch
'@agentskit/cli': patch
---

Stop advertising broken CommonJS entry points for the Ink 7-based packages. Both packages remain available through ESM imports, including dynamic `import()` from CommonJS applications; the CLI executable is unchanged.
