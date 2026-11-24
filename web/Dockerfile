# Build context is the repo root (npm workspaces share one lockfile).
FROM docker.io/library/node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/
RUN npm ci --workspace web
COPY web web
RUN npm run build --workspace web

# Static files + /api reverse proxy. In AWS this maps to S3/CloudFront + an ALB.
FROM docker.io/library/nginx:1.29-alpine
# Templates are rendered at startup; NGINX_ENTRYPOINT_LOCAL_RESOLVERS supplies the DNS resolver.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/web/dist /usr/share/nginx/html
