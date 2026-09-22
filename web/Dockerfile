# react-scripts 3 (webpack 4) needs OpenSSL's legacy provider on Node >= 17.
FROM node:20-alpine AS build

WORKDIR /app
ENV NODE_OPTIONS=--openssl-legacy-provider

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# Same-origin API (see nginx.conf); override only if the API is served elsewhere.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN yarn build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
