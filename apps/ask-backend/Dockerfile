# Central Ask backend (RFC-0007) — Docker build for Railway.
#
# Why Docker over Nixpacks: Nixpacks auto-ran `npm i`, which chokes on this
# monorepo's `workspace:*` deps (EUNSUPPORTEDPROTOCOL). Docker gives us pnpm +
# corepack and full control over the native ONNX runtime.
#
# Debian (bookworm) base — NOT alpine: onnxruntime-node ships a glibc native
# binary; musl would fail to load it. Build context is the REPO ROOT (the backend
# imports the docs app's source + the committed index via relative paths, so it
# needs the whole workspace).
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
RUN corepack enable

WORKDIR /app

# CI=true so pnpm purges any stray node_modules non-interactively (no TTY in build).
ENV CI=true

# Whole workspace — the backend resolves `../../docs-next/lib/*` + the index at runtime.
# (node_modules / .git / dist / caches are excluded via .dockerignore — deps are
# installed and libs built fresh below.)
COPY . .

# Install all workspace deps, then build ONLY the libs the backend resolves to
# `dist` (its dependency closure: adapters/core/rag/validation + rag's deps). The
# Next apps are never built. `tsx` (a devDep) runs the backend's TS directly.
RUN pnpm install --frozen-lockfile \
 && pnpm exec turbo run build \
      --filter='@agentskit/adapters...' \
      --filter='@agentskit/rag...' \
      --filter='@agentskit/validation...'

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# The persistent process: the ONNX embedder + corpus index load once at boot and
# stay warm. The container filesystem caches the model (no /tmp hack needed).
CMD ["pnpm", "--filter", "@agentskit/ask-backend", "start"]
