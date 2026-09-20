# Imagem de produção para VPS/Docker/Portainer — build multi-stage usando
# output: 'standalone' do Next.js (ver next.config.mjs) para uma imagem
# enxuta. Variáveis de ambiente (.env) são injetadas em runtime pelo
# docker-compose/Portainer, não em build time — a mesma imagem serve
# qualquer clínica/cliente, só troca o .env.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
# python3/make/g++: só usados se o better-sqlite3 não tiver binário
# pré-compilado para a arquitetura do host (ex.: ARM) — nesse caso o npm
# compila a partir do código-fonte durante o install.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/data \
    && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
