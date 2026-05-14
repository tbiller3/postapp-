FROM node:20-slim

# Enable corepack and install pnpm 9 (matches lockfileVersion: '9.0')
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies — skip frozen-lockfile so pnpm regenerates
# cleanly (the lockfile has a settings mismatch from Replit's workspace config)
RUN pnpm install --no-frozen-lockfile

# Build the React frontend
RUN BASE_PATH=/ pnpm --filter @workspace/postapp build

# Build the API server (esbuild bundles to dist/index.mjs)
RUN pnpm --filter @workspace/api-server build

# Railway injects PORT automatically
EXPOSE 3000

CMD ["node", "artifacts/api-server/dist/index.mjs"]
