# O app de financeiro.<domínio>: Vite + React 19 + TypeScript sobre o kit @ctn/base (que vem do tarball em vendor/, sem credencial do GitHub),
# compilado em arquivos estáticos e servido por nginx, que também repassa /api/ à API.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci

COPY . .

# Mesma origem (veja nginx.conf): o build não leva endereço absoluto; `VITE_API_URL` só muda isso.
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
