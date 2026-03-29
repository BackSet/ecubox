# ---- Stage 1: Build ----
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM caddy:2-alpine
WORKDIR /srv

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/dist

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
