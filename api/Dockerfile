# Build context is the repo root (npm workspaces share one lockfile).
FROM docker.io/library/node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
# better-sqlite3 bundles prebuilt binaries for each platform; --ignore-scripts skips npm's
# default node-gyp rebuild (needs Python/make) and any dependency install scripts.
RUN npm ci --workspace api --omit=dev --ignore-scripts && npm cache clean --force
COPY api/src api/src
RUN mkdir /data && chown node:node /data
USER node
WORKDIR /app/api
EXPOSE 3001
CMD ["node", "src/server.ts"]
