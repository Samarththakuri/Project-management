# syntax=docker/dockerfile:1.7

# Base image pinned by digest, not by tag. A tag can be re-pointed at new content
# at any time; a digest cannot, which is what makes a build reproducible and what
# lets Trivy results stay meaningful between runs.
# Resolved from: node:22-alpine
# Refresh with: docker buildx imagetools inspect node:22-alpine
ARG NODE_IMAGE=node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32

# ---------------------------------------------------------------------------
# Stage 1: dependencies
#
# bcrypt is a native module, so it needs a C++ toolchain to build. That toolchain
# is ~150MB and has its own CVE surface, so it stays in this stage and never
# reaches the image we ship.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

# package.json and the lockfile are copied on their own so this layer is only
# rebuilt when dependencies actually change, not on every source edit.
COPY package.json package-lock.json ./

# --omit=dev: vitest, supertest and mongodb-memory-server are test-time only.
# npm ci (not npm install) installs exactly what the lockfile pins.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ---------------------------------------------------------------------------
# Stage 2: runtime
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

# dumb-init becomes PID 1. Node is not designed to run as PID 1: it does not reap
# orphaned children and, more importantly here, signal delivery is unreliable.
# The SIGTERM handler in src/index.js is what makes rolling updates graceful, so
# the signal has to actually arrive.
RUN apk add --no-cache dumb-init

# Only non-sensitive defaults live here. MONGO_URI, the token secrets and the SMTP
# credentials are injected at runtime from a Kubernetes Secret that is created
# with kubectl and never committed. Nothing secret is baked into a layer - a
# layer is world-readable to anyone who can pull the image.
ENV NODE_ENV=production \
    PORT=8000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app

# A dedicated high-uid account. The image never runs as root, and the uid is fixed
# so the Kubernetes securityContext can assert runAsUser: 10001.
RUN addgroup -g 10001 -S nodejs \
 && adduser -u 10001 -S nodejs -G nodejs

COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules

# Only what the process actually needs at runtime. Note that src/app.js calls
# express.static("public") and src/index.js reads "./.env", both relative to the
# working directory - hence WORKDIR /app with public/ alongside src/.
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src
COPY --chown=10001:10001 public ./public

USER 10001:10001

EXPOSE 8000

# Ignored by Kubernetes (which uses the probes in the Deployment) but used by
# docker compose and by anyone running the image directly.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
