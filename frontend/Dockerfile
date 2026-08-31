# syntax=docker/dockerfile:1.7

# Both bases pinned by digest so the build is reproducible and scan results are
# comparable between runs.
# Resolved from: node:22-alpine
ARG NODE_IMAGE=node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
# Resolved from: nginxinc/nginx-unprivileged:1.29-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.29-alpine@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6

# ---------------------------------------------------------------------------
# Stage 1: build the bundle
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# Dev dependencies are required here: vite, the react plugin, tailwind and postcss
# are all build-time tools. None of them survive into the final image.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: serve
#
# The result is a static bundle, so there is no Node runtime in the shipped image.
# nginx-unprivileged is used rather than the standard nginx image because the
# standard one starts as root to bind :80 and then drops privileges - which fails
# outright under a runAsNonRoot pod security context.
# ---------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# uid 101 is the pre-existing nginx user in this image.
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
