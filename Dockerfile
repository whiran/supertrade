# ==============================================================================
# TradingView Replica — All-in-One Unified Dockerfile
# Packages React/Vite Frontend, Nginx Reverse Proxy, Fastify Gateway & SQLite
# ==============================================================================

# Build Stage
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install

COPY tsconfig.base.json vitest.config.ts ./
COPY shared ./shared
COPY server ./server
COPY client ./client

RUN npm run build --workspace=shared && \
    npm run build --workspace=server && \
    npm run build --workspace=client

# Runtime Stage with Nginx & Node via Supervisord
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    python3 \
    make \
    g++ \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

RUN npm install --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist /var/www/html

COPY nginx.conf /etc/nginx/sites-available/default
RUN sed -i 's|/usr/share/nginx/html|/var/www/html|g' /etc/nginx/sites-available/default

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN mkdir -p /app/data /var/log/supervisor

EXPOSE 80 3001

VOLUME ["/app/data"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
