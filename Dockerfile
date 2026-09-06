# Use Node.js 22 Slim as base image
FROM node:22-bookworm-slim AS base

# Install all dependencies for build
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --legacy-peer-deps

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production runtime image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create user and group FIRST (needed for chown later)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Install system libraries for Playwright + Python (JobSpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js Playwright browsers (Chromium) for ATS form automation
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
RUN npx playwright install --with-deps chromium \
    && chown -R nextjs:nodejs /app/.playwright

# Install Python Playwright + JobSpy (PyPI 'jobspy' is wrong package)
RUN pip3 install --break-system-packages playwright \
    && pip3 install --break-system-packages git+https://github.com/Bunsly/JobSpy.git

# Copy application files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy job ingestion scripts (JobSpy + LinkedIn workers)
COPY --chown=nextjs:nodejs scripts/ ./scripts/

# Create directories needed by workers
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
