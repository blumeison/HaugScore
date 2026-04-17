# ── Stage 1: build the Vite React client ──
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Install deps first for better layer caching
COPY client/package.json client/package-lock.json ./
RUN npm ci

# Build the client. VITE_SERVER_URL is left empty → client falls back
# to window.location.origin at runtime, which is what we want for same-origin.
COPY client/ ./
RUN npm run build


# ── Stage 2: production server + bundled static client ──
FROM node:20-alpine

WORKDIR /app/server

# Install prod-only server deps
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# Copy the built client into the expected relative path
COPY --from=client-builder /app/client/dist /app/client/dist

# Data directory (persistent volume mount point on fly.io)
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]
