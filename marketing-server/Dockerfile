FROM node:20-slim AS builder

WORKDIR /app

# Install ALL deps (including devDeps) for the TypeScript build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Install FFmpeg for video rendering
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy Firebase service account into the dist folder (matches FIREBASE_SERVICE_ACCOUNT_PATH)
COPY rraasiServiceAccount.json ./dist/rraasiServiceAccount.json

EXPOSE 4001
ENV NODE_ENV=production
ENV MARKETING_PORT=4001

CMD ["node", "dist/index.js"]
