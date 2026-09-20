# BuildAIResume — production image
#
# Layer-cache strategy
# --------------------
# Everything expensive lives in a stage whose inputs are ONLY the pinned base digest and a pinned
# version string. Application source changes invalidate `builder`; they must never invalidate the
# Chromium layer. Previously they could, which is what made deploys re-download ~170 MB of browser
# plus 155 apt packages.
#
# The base image is pinned by DIGEST, not tag. `node:22-bookworm-slim` is a mutable tag: when Docker Hub
# republishes it the digest changes, and every layer after `FROM base` is invalidated — producing exactly
# the "deps cached, apt re-running" pattern in the deploy logs. Bump deliberately, and expect one slow
# build when you do.

FROM node:22-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS base

# ── deps ───────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --legacy-peer-deps

# ── builder ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ── browsers ───────────────────────────────────────────────────────────────────
# Chromium binaries for Playwright, which is used by BOTH the app (unifiedApplyService launches Chromium
# for Greenhouse/Lever/Ashby ATS form automation) and the JobSpy worker.
#
# This stage depends on nothing but the base digest and PLAYWRIGHT_VERSION, so an app-code change cannot
# invalidate it. Keep the version in lockstep with `playwright` in package.json / package-lock.json — a
# mismatch means Playwright looks for a browser build that is not here.
FROM base AS browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
ENV PLAYWRIGHT_VERSION=1.62.1
RUN npx --yes playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium

# ── runner ─────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright

# Create user and group FIRST (needed for chown later)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Chromium's runtime libraries. The `browsers` stage installed its own copies via `--with-deps`, but that
# filesystem is discarded — only the browser binaries are carried over below, so these must be present
# here. Also carries the Python runtime used by the ingestion workers.
#
# Stage 2 target: drop python3/pip/venv/git and the X/GTK libraries once job discovery, LinkedIn
# scraping and ATS auto-apply all run as VPS-side services.
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

# Browser binaries from the cacheable stage. Placed before the pip install and before any app COPY so a
# source change cannot invalidate it.
COPY --from=browsers --chown=nextjs:nodejs /app/.playwright /app/.playwright

# Install Python Playwright + JobSpy (PyPI 'jobspy' is the wrong package — this fork is the real one).
# Cache key is the preceding layers only, none of which depend on application source.
#
# Stage 2 target: delete this layer along with `scripts/` once the remote worker path is verified.
RUN pip3 install --break-system-packages playwright \
    && pip3 install --break-system-packages git+https://github.com/Bunsly/JobSpy.git

# Copy application files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Job ingestion scripts (JobSpy + LinkedIn workers).
# Stage 2 target: this stays only as long as `engine.ts` keeps its local `spawn()` fallback.
COPY --chown=nextjs:nodejs scripts/ ./scripts/

# Create directories needed by workers
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
