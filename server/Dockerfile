# Abfahrt · API + Webapp in einem Container. Build-Kontext = /root/abfahrt (enthält app/ und server/).
FROM node:24.21.0-alpine

ENV NODE_ENV=production
WORKDIR /srv

COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; \
    else npm install --omit=dev --no-audit --no-fund; fi \
 && npm cache clean --force

COPY server/src ./src
COPY server/test ./test
COPY app/ ./public/
# Referenz-Schema, KI-Funktion und Entwickler-Readme nicht öffentlich ausliefern
RUN rm -rf ./public/supabase ./public/README.md && find ./public -name '*.sql' -delete

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "--max-old-space-size=256", "src/server.js"]
