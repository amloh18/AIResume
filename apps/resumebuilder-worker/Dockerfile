# ==========================================
# BuildAIResume Job Ingestion Microservice
# Multi-Stage Production Dockerfile
# ==========================================

# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json tsconfig.json ./

# Install all dependencies for compiling TypeScript
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript to Javascript (/app/dist)
RUN npm run build

# Prune dev dependencies for lean production image
RUN npm prune --production

# 2. Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001

# Create non-root system user for security
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy pruned production node_modules & compiled JS from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["node", "dist/index.js"]
