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

# Bake the pinned ONNX embedding model into the image from an AgentsKit-owned release
# asset. Hugging Face serves the public model through Xet, which rejects some hosted
# builder egress IPs; the release mirror makes builds deterministic without requiring
# a third-party token. The checksum fails closed if the artifact ever changes.
# `embed.ts` reads the same TRANSFORMERS_CACHE, so build + runtime agree on the path.
ENV TRANSFORMERS_CACHE=/app/.transformers-cache
ARG ASK_MODEL_ARCHIVE_URL=https://github.com/AgentsKit-io/agentskit/releases/download/ask-model-bge-small-en-v1.5-v1/bge-small-en-v1.5-transformersjs.tar.gz
ARG ASK_MODEL_ARCHIVE_SHA256=dfcdca3b93a40f1afb10248d2b3b8c206fe128dc2d8e1f0ccf985cf608c4e3d6
RUN ARCHIVE_URL="$ASK_MODEL_ARCHIVE_URL" node --input-type=module -e "import { createWriteStream } from 'node:fs'; import { Readable } from 'node:stream'; import { pipeline } from 'node:stream/promises'; const response = await fetch(process.env.ARCHIVE_URL); if (!response.ok || !response.body) throw new Error('model archive download failed: HTTP ' + response.status); await pipeline(Readable.fromWeb(response.body), createWriteStream('/tmp/ask-model.tar.gz'));" \
 && echo "${ASK_MODEL_ARCHIVE_SHA256}  /tmp/ask-model.tar.gz" | sha256sum -c - \
 && mkdir -p "$TRANSFORMERS_CACHE" \
 && tar -xzf /tmp/ask-model.tar.gz -C "$TRANSFORMERS_CACHE" \
 && rm /tmp/ask-model.tar.gz \
 && cd apps/ask-backend \
 && node --input-type=module -e "import('@huggingface/transformers').then(async (t) => { t.env.cacheDir = process.env.TRANSFORMERS_CACHE; t.env.allowRemoteModels = false; await t.pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5'); console.log('embedding model baked into image'); })"

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# The persistent process: the embedder loads the pre-baked model at boot and stays
# warm; the corpus index loads once too. No runtime model download.
CMD ["pnpm", "--filter", "@agentskit/ask-backend", "start"]
