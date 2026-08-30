# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build && pnpm build:server && pnpm build:companion

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    OMB_PORT=8799 \
    OMB_WEBHOOK_PORT=8800 \
    OMB_COMPANION_PORT=8810 \
    OMB_CONTROL_PORT=8811 \
    OMB_DATA_DIR=/data/openmausbot \
    OMB_COMPANION_DIR=/data/companion

WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server
COPY --from=build --chown=node:node /app/dist-companion ./dist-companion
COPY --from=build --chown=node:node /app/skills ./skills
COPY --from=build --chown=node:node /app/scripts/docker-entrypoint.mjs ./scripts/docker-entrypoint.mjs
RUN mkdir -p /data/openmausbot /data/companion && chown -R node:node /data

USER node
EXPOSE 8810
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8810/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["node", "/app/scripts/docker-entrypoint.mjs"]
