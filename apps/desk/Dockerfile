# Scrinium Ordinis — Desk (Coolify / Docker)
# Build-Context: Monorepo-Root
#   docker build -f apps/desk/Dockerfile .
#
# Migrationen: lokal mit pnpm db:migrate (nicht im Container)

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

# --- Prune: nur @scrinium/desk + Abhängigkeiten ---
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2 prune @scrinium/desk --docker

# --- Install + Build ---
FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
# Next braucht zur Build-Zeit keine echten Secrets; Runtime setzt Coolify
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm turbo run build --filter=@scrinium/desk

# --- Runner (Standalone) ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/apps/desk/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/desk/.next/static ./apps/desk/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/desk/public ./apps/desk/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/desk/server.js"]
