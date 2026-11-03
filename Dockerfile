FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p data && chown bun:bun data

# bun is uid 1000, which owns ./data on the host
USER bun

EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
